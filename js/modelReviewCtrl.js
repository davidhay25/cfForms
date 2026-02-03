angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,modelsSvc,modelCompSvc,$timeout, $uibModal,makeQSvc,utilsSvc,$window,$filter,
                  snapshotSvc,vsSvc,qHelperSvc,$sce,$localStorage,makeQHelperSvc,modelReviewSvc,qrVisualizerSvc,
                  v2ToFhirSvc,validatorSvc) {

            $scope.input = {}

            $scope.input.SDCOnly = false

            $scope.extensionUrls = makeQHelperSvc.getExtensionUrls()

            $scope.selectionOptions = []



            //todo - UI for adding forms servers. Store in db. Only I can remove


         //   $timeout(function () {
                utilsSvc.getConfig().then(
                    function (config) {
                        $scope.systemConfig = config
                        console.log($scope.systemConfig)
                        if (config.environment == 'canshare') {
                            $scope.selectionOptions.push({display:"Select Published Questionnaire",code:'published'})
                            $scope.selectionOptions.push({display:"Upload Questionnaire",code:'adhoc'})
                        } else {
                            //clinfhir
                            $scope.selectionOptions.push({display:"Retrieve from External Form Manager",code:'manager'})
                            $scope.selectionOptions.push({display:"Upload Questionnaire",code:'adhoc'})
                            $scope.selectionOptions.push({display:"Retrieve from Library",code:'library'})

                        }


                        $scope.input.selectedInputOption = $scope.selectionOptions[0]

                    }
                )
         //   },500)

            //https://fhir.forms-lab.com/

            let prePopConfig = $localStorage['ppConfig']

            if (! prePopConfig) {
                //prePopConfig = {dataServer:"https://hapi.fhir.org/baseR4"}
                prePopConfig = {dataServer:"https://test.clinfhir.com/fhir"}
                prePopConfig.termServer = "https://tx.fhir.org/r4"
                prePopConfig.formServer = "https://hapi.fhir.org/baseR4"

                prePopConfig.patient = {reference: 'Patient/sample1', display: 'Example Patient'}
                prePopConfig.practitioner = { reference: 'Practitioner/sample1', display: 'Example Practitioner' }

            }





            //display and/or edit the pre-pop details
            $scope.prePopDetails = function () {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'xlg',
                    templateUrl: 'modalTemplates/prePopConfig.html',

                    controller: 'prePopConfigCtrl',

                    resolve: {
                        prePopConfig: function () {
                            return prePopConfig
                        }
                    }

                }).result.then(function (config) {
                    $localStorage['ppConfig'] = config
                    //getAllAdHoc()   //update the list

                })
            }


            $scope.showRenderOptions = true //will display the prepop / extract options in the renderer

            $scope.serverbase = "https://fhir.forms-lab.com/"

            // ----------- consume events emitted by the v2 Q renderer ----
            $scope.$on('viewVS',function (event,vs) {
                $scope.viewVS(vs)
            })



            //forms manager functions

            //retrieve all adHoc Q - latest version of each. metadata only
            //actually the library...
            function getAllAdHoc() {
                $http.get('adhocq/all').then(
                    function (data) {
                        $scope.allAdHoc = data.data
                        $scope.allAdHoc.sort(function (a,b) {
                            if (a.title?.toLowerCase() > b.title?.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        })
                    }
                )
            }
            getAllAdHoc()

            $scope.showLibraryLine = function (miniQ) {
                if (! $scope.input.libraryTitleFilter) {
                    return true
                }

                let filter = $scope.input.libraryTitleFilter?.toLowerCase() || ""
                let title = miniQ?.title?.toLowerCase() || ""

                if (title.indexOf($scope.input.libraryTitleFilter) > -1) {
                    return true
                } else {return false}

            }

            $scope.saveAdHocQ = function () {
                //Add a Q to the Form Manager
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    //size : 'xlg',
                    templateUrl: 'modalTemplates/saveAdHocQ.html',

                    controller: 'saveAdHocQCtrl',

                    resolve: {
                        Q: function () {
                            return $scope.fullQ
                        }
                    }

                }).result.then(function () {
                    getAllAdHoc()   //update the list

                })
            }


            //used by external Form Manager component
            $scope.$on("QLoaded",function (event,data) {
                $scope.fullQ = data
                $scope.input.mainTabActive = 1
                processQ(data)
            })

            //this is actually the library - load a single version
            $scope.loadFromManager = function(miniQ) {
                let qry = `adhocq?url=${miniQ.url}&version=${miniQ.version}`
                $http.get(qry).then(
                    function (data) {
                        $scope.fullQ = data.data
                        $scope.input.mainTabActive = 1
                        processQ($scope.fullQ)

                    }, function (err) {

                    }
                )
            }



            // --------- validation functions

            $scope.validate = function () {

                $scope.validationInProgress = true
                validatorSvc.validate($scope.fullQ).then(
                    function (data) {
                        $scope.validationResult = data

                    }
                ).finally(() => $scope.validationInProgress = false)
            }

            $scope.showItemHierarchy = function (item) {
                $scope.viewItem(item)

            }


            //------- file upload functions
            //called when a file is selected in the input selector
            $scope.fileSelected = function (input) {
                $scope.$apply(function () {
                    if (input.files && input.files.length > 0) {
                        //$scope.jsonFileSelected = true;

                        // Get the first file's name
                        $scope.selectedFileName = input.files[0].name;

                        // Optionally, auto-upload
                        $scope.uploadJson();
                    }
                });
            };


            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;

                    $scope.input.pastedQ = data
                    console.log(data)

                    $scope.$digest()


                }

                //perform the read...
                r.readAsText(fileObject);
            }


            //--------- setup the form viewer -------------------
            // https://chat.fhir.org/#narrow/channel/179255-questionnaire/topic/smart.20web.20messaging/with/544100483
            //
            //https://github.com/brianpos/sdc-smart-web-messaging

            $scope.input.hideEmptyRows = true

            let setContext = function () {

                let testResource = {resourceType:'Observation',valueString:"test data"}

                //tod can the context be a resource
                $scope.sendMessage('sdc.configureContext', {
                    context: {
                        subject: prePopConfig.patient,
                        author: prePopConfig.practitioner,

                        launchContext: [
                            {
                                name: 'source',
                                contentReference: prePopConfig.practitioner
                            },{
                                name: 'testObservation',
                                contentResource: testResource
                            }
                        ]
                    }
                })

                $scope.sendMessage('sdc.configure', {
                    terminologyServer: prePopConfig.termServer,// 'https://tx.fhir.org/r4',
                    dataServer: prePopConfig.dataServer, //'https://hapi.fhir.org/baseR4',
                    formsServer: prePopConfig.formServer //'https://hapi.fhir.org/baseR4'
                });
            }

            function setQR(QR) {
                $scope.renderedQR = QR //for the display

                let vo = qrVisualizerSvc.makeReport($scope.fullQ,QR)


                //console.log(vo)

                $scope.qBasedReport = vo.report
                $scope.codedItems = vo.codedItems
                $scope.textReport = vo.textReport

                //alternative QR focussed report
                let vo1 = qrVisualizerSvc.makeReport1($scope.fullQ,QR)
                $scope.qBasedReport1 = vo1.report


                $scope.$digest()

            }

            function formViewerSetup() {

                //if the messagingHandle exists, the setuo has already been done.
                if ($scope.messagingHandle) {
                    return
                }

                $scope.messageCounter = 0
                let url = "https://dev.fhirpath-lab.com/swm-csiro-smart-forms"
                const iframe = document.getElementById('formPreview');
                $scope.messagingHandle = 'cf-forms-' + Date.now() // Unique handle for this session
                $scope.messagingOrigin = window.location.origin // Origin for message validation

                //need to pass the messaging handle & origin when initializing the iFrame
                iframe.src = `${url}?messaging_handle=${encodeURIComponent($scope.messagingHandle)}&messaging_origin=${encodeURIComponent($scope.messagingOrigin)}`

/*
                //set the context
                $timeout(function () {
                    $scope.sendMessage('sdc.configureContext', {
                        context: {
                            subject: { reference: 'Patient/45086382', display: 'Example Patient' },
                            author: { reference: 'Practitioner/10652933', display: 'Example Practitioner' },
                            launchContext: [
                                {
                                    name: 'source',
                                    contentReference: { reference: 'Practitioner/10652933',
                                        display: 'Example Practitioner' }
                                }
                            ]
                        }
                    })

                    $scope.sendMessage('sdc.configure', {
                        terminologyServer: 'https://tx.fhir.org/r4',
                        dataServer: 'https://hapi.fhir.org/baseR4',
                        formsServer: 'https://hapi.fhir.org/baseR4'
                    });


                },1000)


                */
                window.addEventListener('message',function (data) {
                    let msg = data.data
                    let msgType = msg.messageType
                    console.log(msgType)

                    if (msg.responseToMessageId) {
                        if (hashResponse[msg.responseToMessageId]) {
                            hashResponse[msg.responseToMessageId]()
                            delete hashResponse[msg.responseToMessageId]

                        }
                    }

                    switch (msgType) {
                        case "sdc.ui.changedFocus":
                            console.log(msg.payload.linkId)
                            break
                        case 'sdc.ui.changedQuestionnaireResponse' :
                            setQR(msg.payload?.questionnaireResponse)
                            break

                        default :
                            //this could be the response to an extract.
                            //todo i should really track that message Id
                            if (msg.payload?.extractedResources) {
                                $scope.processExtractBundle(msg.payload.extractedResources)
                                $scope.$digest()
                            } else if (msg.payload?.questionnaireResponse) {
                                setQR(msg.payload.questionnaireResponse)
                            } else {
                                console.log(angular.toJson(msg))
                                console.log(msg.payload)
                                if (msg.payload?.status == 'error') {
                                    let msg1 = "An error was returned from the last operation. Details are: \n"
                                    for (const iss of msg.payload?.outcome?.issue) {
                                        msg1 += iss.diagnostics + "\n"
                                    }
                                    msg1 += "A common cause of this is that the Data Server is unavailable"
                                    alert(msg1)
                                }

                            }

                            break

                    }
                })

            }

            //set up the formViewer iFrame when the page loads.
            function waitForIframe() {
                $timeout(() => {
                    const iframe = document.getElementById('formPreview');

                    if (iframe) {
                        formViewerSetup();
                    } else {
                        // Try again shortly
                        waitForIframe();
                    }
                }, 100); // 50–100ms is typical
            }
            waitForIframe();




            //display the current form.
            $scope.previewQ = function (Q) {
                Q = Q || $scope.fullQ   //when called from the rendering page, not included
                console.log('Sending Q to renderer',Q)
                //this needs to be called once per session
                if (! $scope.messagingHandle) {
                    //we wait a couple of seconds to make sure the iframe has loaded

                    $timeout(function () {
                        console.log("messagingHandle not set. Waiting a second...")
                        $scope.sendMessage('sdc.displayQuestionnaire', {questionnaire:Q});
                        setContext()

                    },1000)

                } else {console.log("messagingHandle was set. Initializing iFrame...")
                    $scope.sendMessage('sdc.displayQuestionnaire', {questionnaire:Q});
                    setContext()

                }
            }

            //send a message to the iframe. Assume that formViewerSetup() has been called to create the messaging handle
            //returns the message id
            let hashResponse = {}
            $scope.sendMessage = function(messageType, payload,fnResponse) {
                let messagingHandle = $scope.messagingHandle

                const iframe = document.getElementById('formPreview');

                //should never happen...
                if (!iframe || !iframe.contentWindow) {
                    alert('Iframe not loaded yet!');
                    return;
                }

                const messageId = `msg-${++$scope.messageCounter}`;

                if (fnResponse) {
                    hashResponse[messageId] = fnResponse
                }

                const message = {
                    messagingHandle,
                    messageId,
                    messageType,
                    payload
                };

                const targetWindow = iframe.contentWindow;
                const targetOrigin = '*' //http://localhost:8081'; // must match iframe origin

                console.log('Sending message:', message);
                targetWindow.postMessage(message, targetOrigin);
                return messageId
            };

            $scope.fitGraph = function () {
                $timeout(function () {
                    $scope.resourceChart.fit()
                },500)
            }


            //instruct the renderer to pre-pop
            //parameters are set in the sdc.configureContext() and sdc.configure() calls
            $scope.setPrepop = function () {
                let responseFn = function () {
                    $scope.sendMessage('sdc.requestCurrentQuestionnaireResponse',{})
                }
                $scope.sendMessage('sdc.requestPrepopulate',{},responseFn)


            }

            //get the extract bundle from the currently rendered form
            $scope.getExtractBundle = function () {
                $scope.sendMessage('sdc.requestExtract', {});
            }

            $scope.processExtractBundle = function (bundle) {

                $scope.extractBundle = bundle

                let options = {bundle:bundle,
                    hashErrors:{},
                    serverRoot:""}


                let vo = v2ToFhirSvc.makeGraph1(options);
                console.log(vo)

                let container = document.getElementById('resourceGraph');
                let graphOptions = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                            centralGravity: 0.3,
                            springLength: 120,
                            springConstant: 0.04,
                            damping: 0.09,
                            avoidOverlap: 0.2
                        },
                        stabilization: {
                            iterations: 200,   // try lowering from default (1000)
                            updateInterval: 25
                        }

                    }
                }

                $scope.resourceChart = new vis.Network(container, vo.graphData, graphOptions);

                // 🚀 Turn off physics after initial layout
                $scope.resourceChart.once('stabilizationIterationsDone', function () {
                    $scope.resourceChart.setOptions({ physics: false });
                });



            }

            $scope.showInBV = function () {
                const bvWindow = window.open('loadingBV.html', '_blank')
                let id = `id${new Date().getTime()}`

                let bundle = angular.copy($scope.extractBundle)
                bundle.id = id

                let qry = `saveBundle/${id}`
                //todo likely want other metadata here
                let vo = {bundle:bundle}
                $http.put(qry,vo).then(
                    function (data) {

                        const base = `${location.protocol}//${location.host}`

                        let qry = `bundleid=${id}`
                        const url = `${base}/clinfhir/bundleViewer.html?${qry}`

                        console.log(url)
                        bvWindow.location.href = url;

                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )




            }

            //----------------------------------

            $scope.input.QR =  $localStorage.QR //dev




            $scope.popoverItem = function (item) {
                if (item) {

                    let text = angular.toJson(item,true)
                    text = text.replace(/\n/g, '<br>')
                    return `<pre>${text}</pre>`

                }
            }

            //display the technical items
            $scope.input.technical = true


            // ========== direct access functions - ap called with the name of a published Q

            let search = $window.location.search;
            let modelName = null    //this is used when a q name is passed on the url - from the editor
            $scope.compVersion = null

            if (search) {

                modelName = search.substr(1)

            }


            $scope.selectQ = function (qName) {
                delete $scope.selectedModel
                delete  $scope.fullQ
                $scope.loadQ(qName)
            }




            //view the hierarchy of an item
            $scope.viewItem = function (item) {

                makeQHelperSvc.showItemDetailsDlg(item,$scope.fullQ)


            }

            $scope.makeQDownload = function (Q) {
                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(Q,true) ],{type:"application/json"}))
                $scope.downloadLinkJsonName = `${Q.name}-${Q.version}.json`

                console.log($scope.downloadLinkJsonName)

                $scope.selectedQVersion = Q

                //get any release notes for this version
                delete $scope.versionReleaseNotes
                let extReleaseNotesUrl = $scope.extensionUrls.releaseNotes
                let arExt = utilsSvc.getExtension(Q,extReleaseNotesUrl)
                if (arExt.length > 0) {
                    $scope.versionReleaseNotes =  arExt[0].valueMarkdown
                }
            }


            $scope.viewPublishedQ = function (Q) {
                $scope.input.mainTabActive = 1
                $scope.fullQ = Q

                if (window.umami) {
                    window.umami.track('selectQ',{type:'published',name:Q.name});
                }

                processQ($scope.fullQ)

            }

            //when a miniQ is selected from the published list (miniQ has no items)
            $scope.selectPublishedQ = function (miniQ) {
               // delete $scope.selectedQ //this will be the full Q
                $scope.selectedMiniQ = miniQ


                let extReleaseNotesUrl = $scope.extensionUrls.releaseNotes
                let arExt = utilsSvc.getExtension(miniQ,extReleaseNotesUrl)
                if (arExt.length > 0) {
                    $scope.selectedMiniQ.releaseNotes =  arExt[0].valueMarkdown
                }

                let qry = `q/${miniQ.name}/versions`
                $http.get(qry).then(
                    function (data) {
                        //returns an array of fullQ versions
                        console.log(data.data)



                        $scope.ddVersions = []
                        let first = true
                        for (const v of data.data) {
                            let date = $filter('date')(v.date)
                            let display = `${v.version} ${date}`
                            if (first) {
                                display += ' (latest)'
                                first = false
                            }
                            delete v['_id']
                            $scope.ddVersions.push({Q:v,version:v.version,display:display})
                        }

                        $scope.input.ddSelectedVersion = $scope.ddVersions[0]
                        $scope.makeQDownload($scope.ddVersions[0].Q)


                    }, function (err) {

                    }
                )

            }

            //update the other local variables from the Q
            function processQ(Q) {
                $scope.hashEd = {}

                //get all the VS in the Q - returne
                //also constructs a hashEd with an ED generated from the item - as best as possible
                let ar = qHelperSvc.getAllVS($scope.fullQ)

                //todo this doesn't seem right...
                for (const thing of ar) {
                    $scope.hashEd[thing.ed.path] = thing.ed
                }

                $scope.lstItems = []  //modelReviewSvc.makeTableData(Q)   //items for a table view

                vsSvc.getAllVS(ar, function () {
                    //A report focussed on pre-popupation & extraction
                    let voReport =  makeQSvc.makeReport($scope.fullQ)
                    $scope.qReport =voReport.report

                    console.log(voReport)



                    //a graph of items
                    //very slow with large graphs todo - ? only look for small Q
                    try {
                        let vo = makeQHelperSvc.getItemGraph($scope.fullQ)
                        makeItemsGraph(vo.graphData)
                    } catch (ex) {
                        console.error(ex)
                    }


                    $scope.previewQ(Q)

                })
            }

            //Load the Q from the database created by the Q designer.. (not published Q)
            $scope.loadQ = function (qName) {
                let qry = `Questionnaire/${qName}`
                $http.get(qry).then(
                    function (data) {
                        $scope.input.mainTabActive = 1
                        $scope.fullQ = data.data.Q
                        $scope.errorLog = data.data.errorLog  //not only errors

                        processQ($scope.fullQ)

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }


            //Load the Q viewer with the selected Q
            $scope.loadQViewerForPublishedQDEP = function () {

                const url = `modelReview.html?q-${qName}`
                const features = 'noopener,noreferrer'
                window.open(url, '_blank', features)
            }

            // process any request that was passed in the call.
            //I *think* it's only from models

            if (modelName) {

                if (modelName.startsWith('q-')) {
                    //a Q reference was passed. The Q will be retrieved from the questionnaire database
                    //this is the da created by the Q designer and is NOT the same as the published Q
                    let qName = modelName.slice(2)
                    $scope.loadQ(qName)




                } else if (modelName.startsWith('url-')) {
                    //a url was passed. This will be retrieved from the lab server
                    let qUrl = modelName.slice(4)


                    let qry = `${$scope.serverbase}Questionnaire?url=${qUrl}`
                    let config = {headers: {'content-type': 'application/fhir+json'}}

                    $http.get(qry, config).then(
                        function (data) {
                            console.log(data.data)
                            if (data.data.entry && data.data.entry.length > 0) {
                                $scope.fullQ = data.data.entry[0].resource
                                processQ($scope.fullQ)  //update internal variables
                                $scope.input.mainTabActive = 1

                            } else {
                                alert(`Error contacting server: ${qry}`)
                            }
                        })
                } else if (modelName.startsWith('pub-'))  {
                    /* Not used...
                    //This is from the csFrontPage - retrieve a published Q
                    let tmp = modelName.slice(4)
                    let ar = tmp.split('|')

                    let qry = `/q/${ar[0]}/v/${ar[1]}` //get that verson of the Q
                    $http.get(qry).then(
                        function (data) {
                            console.log(data)
                            $scope.fullQ = data.data
                            processQ($scope.fullQ)  //update internal variables
                            $scope.input.mainTabActive = 1

                        }, function (err) {
                            console.log(err)
                            alert(err.data.msg)
                        }
                    )
*/
                }

            } else {
                //alert("You'll need to paste in a Questionnaire (Json) format")
            }



            //get all published Q
            $http.get('q/all').then(
                function (data) {
                    $scope.lstQ = data.data
                    //$scope.allQ = data.data
                    try {
                        $scope.lstQ.sort(function (a,b) {
                            if (a.name?.toLowerCase() > b.name?.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                    } catch (ex) {
                        console.error(ex)
                    }
                    //console.log($scope.lstQ)

                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )

            //paste in a Q
            $scope.pasteQ = function (Qstring) {

                $localStorage.pastedQ = Qstring

                let testQ = {}
                try {

                    //convert any R5/6 attributes to R4
                    let vo = modelReviewSvc.convertICCR(JSON.parse(Qstring),$scope.input.parseMakeGroup)
                    testQ = vo.Q
                    //console.log(vo.log)

                    if (window.umami) {
                        window.umami.track('selectQ',{type:'dhhoc',name:Q.name || 'noname'});
                    }


                } catch (ex) {
                    console.log(ex)
                    alert("This is not a valid Json string")
                    return
                }

                if (! testQ.resourceType || testQ.resourceType !== 'Questionnaire') {
                    alert("This is not a Questionnaire")
                    return
                }

                try {
                    $scope.hashEd = {}

                    let voReport =  makeQSvc.makeReport(testQ)
                    $scope.qReport =voReport.report
                    $scope.fullQ = testQ
                    processQ(testQ)
                    $scope.input.mainTabActive = 1


                } catch (ex) {
                    console.log(ex)
                    alert("This is a Questionnaire, but there were errors parsing it.")

                }
            }


            $scope.testxquery = function (xqry) {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'xlg',
                    templateUrl: 'modalTemplates/xquery.html',

                    controller: 'xqueryCtrl',

                    resolve: {
                        query: function () {
                            return xqry
                        }
                    }

                }).result.then(function (concept) {
                    console.log(concept)


                })


            }

            $scope.hasFixedValue = function (ed) {
                if (ed) {
                     if (ed.fixedCode || ed.fixedRatio || ed.fixedQuantity || ed.fixedCoding) {
                        return true
                    }
                }
            }

            $scope.hasDefaultValue = function (ed) {
                if (ed) {
                    if (ed.defaultCode || ed.defaultRatio || ed.defaultQuantity || ed.defaultCoding) {
                        return true
                    }
                }
            }




            //show a comment line in one of the 'allcomments' displays
            $scope.showCommentLine = function (comment) {
                if ($scope.input.newCommentsOnly) {
                    if (comment.disposition && comment.disposition.display) {
                        return false
                    }
                }
                return true
            }

            //if showAllCommentSummary is true (ie the summary tab is being shown) display the full list of comments in the right pane
            $scope.showAllCommentSummary = true
            $scope.tabSelect = function (tabname) {
                //console.log(tabname)
                if (tabname == 'summary') {
                    $scope.showAllCommentSummary = true
                } else {
                    $scope.showAllCommentSummary = false
                }
            }

            $scope.version = utilsSvc.getVersion()






            //passes in a single review to update
            $scope.addDisposition = function(comment) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/disposition.html',
                    backdrop: 'static',
                    controller: function ($scope, comment) {
                        $scope.input = {}
                        $scope.comment = comment
                        csDisposition = "http://canshare.com/fhir/CodeSystem/disposition-code"

                        $scope.input = {}

                        $scope.input.dispositionOptions = []
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'accept',
                            'display': "Change fully accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'mod',
                            'display': "Change partially accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'decline',
                            'display': "Change not accepted"
                        })

                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'noted',
                            'display': "Noted"})

                        $scope.saveDisposition = function() {
                            comment.disposition = $scope.input.disposition
                            comment.dispositionNote = $scope.input.dispositionNote
                            $scope.$close(comment)
                        }





                    },
                    resolve: {
                        comment: function () {
                            return angular.copy(comment)
                        }
                    }

                }).result.then(function (c) {
                    //c is an updated comment

                    let compName = $scope.selectedComp.name

                    let qry = `review/${compName}`
                    $http.put(qry,c).then(
                        function (data) {
                            console.log(data)

                            $scope.setCommentsThisModel()


                            comment = c         //so the change will
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

                })
            }


            $scope.viewVS = function (item,refsetId) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return item
                        }, refsetId : function () {
                            return refsetId
                        }
                    }

                })
            }



            $scope.showReportLine = function (SDCOnly,entry) {
                if (! SDCOnly) {return true}

                if (entry.isSDC) {return true}

                return false
            }

            function makeItemsGraph(graphData) {

                $scope.allGraphData = graphData

                let container = document.getElementById('itemGraph');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            solver: 'barnesHut',
                            barnesHut: {
                                gravitationalConstant: -2000,
                                centralGravity: 0.3,
                                springLength: 95,
                                springConstant: 0.04,
                                damping: 0.09
                            }
                        },
                        layout : {
                            hierarchical : false
                        }
                    };

                    if ($scope.itemGraph) {
                        $scope.itemGraph.destroy()
                    }

                    $scope.itemGraph = new vis.Network(container, graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.itemGraph.on("stabilizationIterationsDone", function () {
                     //   $scope.itemGraph.setOptions({physics: false});


                    });

                    $scope.itemGraph.on("click", function (obj)
                    {

                        let nodeId = obj.nodes[0];  //get the first node
                        let node = $scope.allGraphData.nodes.get(nodeId);
                        $scope.selectedNodeFromItemGraph = node.data




                        $scope.$digest()

                    })
                }


            }

            $scope.downloadQ = function () {
                const json = angular.toJson($scope.fullQ, true);
                let suggestedName = $scope.fullQ.name || "No name"
                const blob = new Blob([json], { type: 'application/json' });

                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = suggestedName; // user can change it
                a.click();

                URL.revokeObjectURL(url);
            };


            $scope.copyToClipboard = function(){
                if ($scope.fullQ) {
                    //https://stackoverflow.com/questions/29267589/angularjs-copy-to-clipboard
                    var copyElement = document.createElement("span");
                    copyElement.appendChild(document.createTextNode(angular.toJson($scope.fullQ),2));
                    copyElement.id = 'tempCopyToClipboard';
                    angular.element(document.body.append(copyElement));

                    // select the text
                    var range = document.createRange();
                    range.selectNode(copyElement);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);

                    // copy & cleanup
                    document.execCommand('copy');
                    window.getSelection().removeAllRanges();
                    copyElement.remove();

                    alert("The Questionnaire has been copied to the clipboard.")
                }

            };


            // ========= deprecated and unused



            //when an element is selected in a form
            $scope.$on('elementSelectedDEP',function(event,vo) {


                console.log('ignoring selection - hash does not align with id')
                return


                let linkId = vo.cell.item.linkId

                //need to get the selectedED (to add to the comment)
                $scope.currentLinkId = linkId
                //todo - what if this is an ED?
                $scope.selectedED = $scope.hashCompElements[linkId].ed



                $scope.commentsThisPath = $scope.commentsThisComp[linkId]

                console.log(linkId)

                //this is just making up a node to match the tree
                $scope.selectedCompositionNode = {data:{}}
                if ($scope.hashCompElements[linkId]) {
                    $scope.selectedCompositionNode.data.ed = $scope.hashCompElements[linkId].ed
                }

                console.log(vo)
            })




            //add a comment to the current comp
            $scope.addComment = function (note) {
                //let path = $scope.selectedCompositionNode.data.ed.path

                let path = $scope.currentLinkId


                //let ed = $scope.selectedCompositionNode.data.ed

                let compName = $scope.selectedComp.name

                let comment = {path:path,compName:compName, compVersion: $scope.compVersion,comment:note}   //will need to add path when saving to db
                comment.id = 'id-'+ new Date().getTime()
                comment.author = $scope.input.author
                comment.ed = $scope.selectedED




                let url = "review"
                $http.post(url,comment).then(
                    function (data) {

                        $scope.setCommentsThisModel(function(){
                            $scope.commentsThisPath = $scope.commentsThisComp[path]
                        })



                    }, function (err) {
                        alert (angular.toJson(err))
                    }
                )


                // temp[path].push(comment)

                //$localStorage.world.comments[compName].push(comment)
                delete $scope.input.comment




            }



            //get all the comments for the given model (comp or dg)
            $scope.setCommentsThisModel = function(vo) {
                let compName = $scope.selectedComp.name     //todo - modelName / selectedModel would be better names
                delete $scope.allComments
                $scope.commentsThisComp = {}

                let url = `review/${compName}`
                $http.get(url).then(
                    function (data) {
                        console.log(data)
                        //what gets returned is an array of comments for this composition (based on name)
                        //the array may be empty
                        //convert it to a hash keyed on path with the contents as an array of comments

                        $scope.allComments = data.data
                        if (data.data && data.data.length > 0) {

                            data.data.forEach(function (comment) {
                                let path = comment.path
                                $scope.commentsThisComp[path] = $scope.commentsThisComp[path] || []
                                $scope.commentsThisComp[path].push(comment)
                            })
                        }

                        //console.log($scope.commentsThisComp)

                        //now construct a summary of comments by section. Really only makes sense for compositions
                        //todo  - this needs work as there is an incorect assumption - see note re ar.slice(3) below
                        $scope.commentsBySection = {}
                        $scope.allComments.forEach(function (comment) {
                            if (comment.path) {
                                let ar = comment.path.split('.')
                                let section = ar[1]     //section is always the 2nd element
                                let control = ar[ar.length-1]   //the name of the element. May be an issue if there is a duplaicted name - like status

                                $scope.commentsBySection[section] = $scope.commentsBySection[section] || []
                                let item = {control:control,comment:comment}
                                item.path = comment.path
                                item.shortPath = ar.slice(3).join('.')      //todo - this isn't always true -
                                $scope.commentsBySection[section].push(item)
                            }


                        })

                        //now sort by control name
                        Object.keys($scope.commentsBySection).forEach(function (key) {
                            let obj = $scope.commentsBySection[key]
                            obj.sort(function (a,b) {
                                if (a.control > b.control) {
                                    return 1
                                } else {
                                    return -1
                                }
                            })
                        })

                        if (vo) {
                            vo()
                        }

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }



            $scope.getRowColourDEP = function (ed) {
                let colour
                switch (ed.kind) {
                    case 'section' :
                        colour = "#eee"
                        break

                }

                if (ed.type && ed.type[0] == 'Group') {
                    colour = "#eee"
                }

                return colour
            }


            $scope.getPathSegments = function (path) {
                if (path) {
                    return path.split('.')
                }

            }

            //the equivalent of the cardinality
            $scope.getObligation = function (ed) {
                if (ed) {
                    if (ed.mult.startsWith('1')) {
                        return "Mandatory"
                    }

                    if (ed.enableWhen && ed.enableWhen.length > 0) {
                        return "Conditional"
                    }

                    return "Optional"
                }


            }


        })