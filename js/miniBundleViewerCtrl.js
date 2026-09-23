angular.module("pocApp")
    .controller('miniBundleViewerCtrl',
        function ($scope,bundle,v2ToFhirSvc,$timeout,$http) {

            $scope.bundle = bundle

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
                    let bundleEndpoint = `https://clinfhir.com/clinfhir/bv/bundle/${entry.bundleId}`

                  console.log(bundleEndpoint)
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
                        alert(angular.toJson(err))


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

                        $scope.selectedResourceFromGraph = node.resource
                        $scope.validate(node.resource)


                        $scope.$digest()

                    })
                },500
            )

        })