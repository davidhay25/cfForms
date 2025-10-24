angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,modelsSvc,modelCompSvc,$timeout, $uibModal,makeQSvc,utilsSvc,$window,$filter,
                  orderingSvc,snapshotSvc,vsSvc,qHelperSvc,$localStorage,makeQHelperSvc,modelReviewSvc) {

            $scope.input = {}

            $scope.input.SDCOnly = false

            $scope.extensionUrls = makeQHelperSvc.getExtensionUrls()

            //dietrich-blake-louis

            $scope.selectionOptions = []
            $scope.selectionOptions.push({display:"Select Published Questionnaire",code:'published'})
            $scope.selectionOptions.push({display:"Paste ad-hoc Questionnaire",code:'adhoc'})
            $scope.input.selectedInputOption = $scope.selectionOptions[0]

            $scope.serverbase = "https://fhir.forms-lab.com/"

            // ----------- consume events emitted by the v2 Q renderer ----
            $scope.$on('viewVS',function (event,vs) {
                $scope.viewVS(vs)
            })


            //--------- setup the form viewer
            function formViewerSetup() {
                $scope.messageCounter = 0
                let url = "https://dev.fhirpath-lab.com/swm-csiro-smart-forms"

                const iframe = document.getElementById('formPreview');
                $scope.messagingHandle = 'cf-forms-' + Date.now(); // Unique handle for this session
                $scope.messagingOrigin = window.location.origin; // Origin for message validation

                //need to pass the messaging handle & origin when initializing the iFrame
                let fullUrl = `${url}?messaging_handle=${encodeURIComponent($scope.messagingHandle)}&messaging_origin=${encodeURIComponent($scope.messagingOrigin)}`
                iframe.src = fullUrl
            }



            //display the current form. //todo - this could be made cleaner to avoid the timeouts...
            $scope.previewQ = function (Q) {
                Q = Q || $scope.fullQ   //when called from the rendering page, not included
                console.log('Sending Q to renderer',Q)
                //this needs to be called once per session
                if (! $scope.messagingHandle) {
                    //we wait a couple of seconds to make sure the iframe has loaded
                    $timeout(function () {
                        formViewerSetup()
                        //then another delay
                        $timeout(function () {
                            $scope.sendMessage('sdc.displayQuestionnaire', {questionnaire:Q});
                        },1000)

                    },2000)
                } else {
                    $scope.sendMessage('sdc.displayQuestionnaire', {questionnaire:Q});
                }
            }

            $scope.sendMessage = function(messageType, payload) {
                let messagingHandle = $scope.messagingHandle

                const iframe = document.getElementById('formPreview');
                if (!iframe || !iframe.contentWindow) {
                    alert('Iframe not loaded yet!');
                    return;
                }

                const messageId = `msg-${++$scope.messageCounter}`;
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
            };

            //----------------------------------

            $scope.input.QR =  $localStorage.QR //dev
            $scope.parseQRDEP = function (text) {
                let QR

                $scope.hashLinkId = {}
                $scope.lstQRItem = []

                try {
                    QR = angular.fromJson(text)
                    $localStorage.QR = text //dev
                } catch (e) {
                    alert("Invalid Json")
                    return
                }

                let qUrl = QR.questionnaire

                let qry = `${$scope.serverbase}Questionnaire?url=${qUrl}`
                let config = {headers:{'content-type':'application/fhir+json'}}

                $http.get(qry,config).then(
                    function (data) {
                        console.log(data.data)
                        if (data.data.entry && data.data.entry.length > 0) {

                            //get the definition of the items from the Q
                            let Q = data.data.entry[0].resource
                            //build a hash of Q items by linkId
                            for (const item of Q.item) {
                                processQItem(item)
                            }

                            //get the answers from the QR
                            for (const item of QR.item) {
                                processQRItem(item,0)
                            }

                        } else {
                            alert(`The Q with the url ${qUrl} was not found`)
                        }

                    },function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

                function processQItem(item) {
                    $scope.hashLinkId[item.linkId] = item

                    if (item.item) {
                        for (const child of item.item) {
                            processQItem(child)
                        }
                    }
                }


                function processQRItem(item,level) {
                    console.log(item.linkId)

                    let def = angular.copy($scope.hashLinkId[item.linkId])
                    delete def.item
                    if (item.answer) {
                       // let def = angular.copy($scope.hashLinkId[item.linkId])
                      //  delete def.item
                        //answer[] is the answer from the QR (an array), answerDisplay[] is a display form
                        let thing = {item:def,answer:item.answer,answerDisplay:[]}
                        thing.level = level
                        //a simplified answer for display
                        for (let ans of item.answer) {
                            //ans will have a single property - valueCoding, valueString etc
                            let keys = Object.keys(ans)
                            for (const key of keys ) {
                                let value = ans[key]
                                thing.dt = key.replace("value","")

                                //should only be 1
                                switch (key) {
                                    case "valueCoding":
                                        thing.answerDisplay.push(`${value.code} | ${value.display} | ${value.system}`)
                                        break
                                    case "valueQuantity":
                                        thing.answerDisplay.push(`${value.value} ${value.code}`)
                                        break
                               /*     case "valueString" :
                                        thing.dt = 'String'
                                        thing.answerDisplay.push(value)
                                        break
                                    */
                                    default :
                                        thing.answerDisplay.push(value)
                                }

                            }
                            $scope.lstQRItem.push(thing)



                        }



                    } else {
                        //there is no answer, but add as a 'section'


                        let thing = {item:def,answer:item.answer,answerDisplay:[]}

                        if (item.item) {
                            thing.dt = "Group"
                        }

                        thing.level = level
                        $scope.lstQRItem.push(thing)
                    }


                    if (item.item) {
                        level++
                        for (const child of item.item) {
                            processQRItem(child,level)
                        }
                    }
                }



            }

            $scope.popoverItem = function (item) {
                if (item) {

                    let text = angular.toJson(item,true)
                    text = text.replace(/\n/g, '<br>')
                    return `<pre>${text}</pre>`

                }
            }

            //display the technical items
            $scope.input.technical = true

            //in the table view, hide common DG like HCP as the details are not relevant to reviewers
            $scope.input.hideSomeDG = true

            let search = $window.location.search;
            let modelName = null    //this is used when a q name is passed on the url - from the editor
            $scope.compVersion = null

            if (search) {

                modelName = search.substr(1)

               // if ($window.location.hash) {
               //     $scope.compVersion = $window.location.hash.substr(1)
            //    }


            }


            $scope.selectQ = function (qName) {
                delete $scope.selectedModel
                delete  $scope.fullQ
                $scope.loadQ(qName)
            }

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
                        $scope.errorLog = data.data.errorLog
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
                            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                    } catch (ex) {

                    }
                    console.log($scope.lstQ)

                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )





            //paste in a Q
            $scope.pasteQ = function (Qstring) {

                $localStorage.pastedQ = Qstring

                let testQ = {}
                try {

                    let vo = modelReviewSvc.convertICCR(JSON.parse(Qstring),$scope.input.parseMakeGroup)
                    testQ = vo.Q
                    console.log(vo.log)
/*
                    let vo1 = modelReviewSvc.makeDG(testQ)
                    //>>>>>>>> temp!!
                    let key = vo1.dg.name
                    $localStorage.world.dataGroups = {}
                    $localStorage.world.dataGroups[key] = vo1.dg
                    */
                   // console.log(vo1.dg)

                } catch (ex) {
                    console.log(ex)
                    alert("This is not a valid Json string")
                    return
                }

                try {
                    $scope.hashEd = {}
                    //A report focussed on pre-popupation & extraction


                    let voReport =  makeQSvc.makeReport(testQ)
                    $scope.qReport =voReport.report
                    $scope.fullQ = testQ
                    processQ(testQ)
                    $scope.input.mainTabActive = 1


                } catch (ex) {
                    console.log(ex)
                    alert("This is a valid Json string, but there were errors parsing it.")

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

            $scope.getPathSegments = function (path) {
                if (path) {
                    return path.split('.')
                }

            }



            //when an element is selected in a form
            $scope.$on('elementSelected',function(event,vo) {


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



            $scope.getRowColour = function (ed) {
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

        })