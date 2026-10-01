angular.module("pocApp")
    .controller('miniBundleViewerCtrl',
        function ($scope,bundle,v2ToFhirSvc,$timeout,$http,renderIssues,QR,utilsSvc) {

            $scope.bundle = bundle
            $scope.input = {}

            //console.log(angular.copy(bundle))

            //create sorted list for list

            $scope.resources = (bundle.entry ?? [])
                .map(e => e.resource)

            $scope.resources.sort(function (a,b) {
                if (a.resourceType > b.resourceType) {
                    return 1
                } else {
                    return -1
                }
            })



            $scope.renderIssues = renderIssues  //really extraction issues

            //get the current lists from clinFHIR. We'll use this to save the bundle to the
            //cfLibrary. Will support a new bundle or updating an existing one.
            let listsSource = "https://clinfhir.com/bqry/lists"

            $http.get(listsSource).then(
                function (data) {
                    $scope.lists = data.data
                    console.log(data.data)
                }
            )

            $scope.updateBundle = function (entry) {
                console.log(entry)
                if (confirm("Are you sure you wish to replace this Bundle in the Library with the new one")) {

                    //where the bundleentry (not the list entry) is located for get and put
                    let bundleEndpoint = `https://clinfhir.com/clinfhir/bv/bundle/${entry.bundleId}`
/*

                    //add id's to all the bundles. Can derive from the fullrl
                    let patientId   //this is a uuid
                    for (let entry of bundle.entry) {

                        entry.resource.id = entry.fullUrl?.substring(9)
                        if (entry.resource.resourceType == 'Patient') {
                            patientId = entry.fullUrl
                        }
                    }

                    if (! patientId) {
                    //    alert("No patient found in the bundle. It cannot be updated.")
                        return
                    }

                    */
/*
                    //add a subject reference
                    QR.subject = {reference:patientId}

                    //add the QR to the bundle

                    let uuid = utilsSvc.getUUID()
                    //QR.id = uuid

                    let qrEntry = {fullUrl:`urn:uuid:${uuid}`,resource:QR}
                    //qrEntry.fullUrl = `urn:uuid:${uuid}`
                    qrEntry.request = {method:"POST",url:"QuestionnaireResponse"}
                    bundle.entry.push(qrEntry)

*/

                    //entry.bundle = bundle


                    console.log(bundleEndpoint,entry)

                    //return

                    //Need to retrieve the BundleEntry that corresponds to the bundle, update the bundle element
                    //and sav it.
                    $http.get(bundleEndpoint).then(
                        function (data) {
                            let bundleEntry = data.data
                            delete bundleEntry["_id"]
                            bundleEntry.bundle = bundle
                            $http.put(bundleEndpoint,bundleEntry).then(
                                function () {
                                    alert('Bundle updated')
                                },function (err) {
                                    alert("Error saving bundle. Details in console.")
                                    console.log(err.data)
                                }
                            )

                        }, function (err) {
                            alert("Error getting current bundle. Details in console.")
                            console.log(err.data)
                        }
                    )


                }
            }

            $scope.addToList = function () {
                if (confirm("Are you sure you wish to add this Bundle to this list")) {

                    //Update the list

                    //Add the bundle


                    let bundleEndpoint = `https://clinfhir.com/clinfhir/bv/bundle/${entry.bundleId}`

                    console.log(bundleEndpoint)
                }
            }

            $scope.validate = function (resource) {
                delete $scope.OO
                let validationServer = "https://hapi.fhir.org/baseR4"
                let type = resource.resourceType
                let qry = `${validationServer}/${type}/$validate`

                $http.post(qry,resource).then(
                    function (data) {
                        $scope.OO = data.data

                    },function (err) {
                        console.log(angular.toJson(err))


                    }
                )

            }

            $scope.copyToClipboard = function() {
                let text = angular.toJson(bundle,true)
                navigator.clipboard.writeText(text)
                    .then(function () {
                        alert("Bundle has been copied to the clipboard");
                    })
                    .catch(function (err) {
                        console.error("Clipboard copy failed", err);
                        alert("Unable to copy the bundle to the clipboard.");
                    });
            }

            $scope.selectList = function (list) {
                $scope.selectedList = list
            }

            $scope.selectBundleEntry = function (bundleEntry) {
                $scope.selectedBundleEntry = bundleEntry

            }


            //locate the QR
            let ar = $scope.bundle.entry.filter(entry => entry.resource?.resourceType == 'QuestionnaireResponse')
            if (ar.length == 1) {
                $scope.qr = ar[0].resource
            }

            let options = {bundle:bundle,
                hashErrors:{},
                serverRoot:""}

            let vo = v2ToFhirSvc.makeGraph1(options);
            //console.log(vo)

            //allow enough time for the html to be parsed
            $timeout(
                function () {
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

                    $scope.resourceChart.on("click", function (obj)
                    {

                        let nodeId = obj.nodes[0];  //get the first node

                        let node = vo.graphData.nodes.get(nodeId);

                        $scope.input.selectedResourceFromGraph = node.resource
                        $scope.validate(node.resource)


                        $scope.$digest()

                    })
                },500
            )

        })