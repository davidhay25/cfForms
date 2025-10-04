angular.module("pocApp")
    .controller('changeTypeCtrl',
        function ($scope,ed,hashAllDG,modelsSvc,utilsSvc, $uibModal,$timeout) {

            $scope.input = {}
            $scope.input.class = "dt"   //show the DataGroups as the default to select

            $scope.ed = ed
            let currentType  // = "Patient"
            if (ed && ed.type) {
                currentType = ed.type[0]
            }

            let fhirBase = "http://hl7.org/fhir/R4B/datatypes.html"

            $scope.fhirTypes = utilsSvc.fhirDataTypes()

            if (currentType && $scope.fhirTypes.indexOf(currentType) > -1) {
                $scope.input.class = "dt"
                $scope.selectedDT = currentType
                $scope.typeUrl = `${fhirBase}#${currentType}`
            }


            function sortDG() {
                $scope.sortedDGList1 = []

                Object.keys(hashAllDG).forEach(function(key){
                    $scope.sortedDGList1.push(hashAllDG[key])
                })

                $scope.sortedDGList1.sort(function (a,b) {
                    try {
                        if (a.title.toLowerCase() < b.title.toLowerCase()) {
                            return -1
                        } else {
                            return 1
                        }
                    } catch (ex) {
                        //swallow errors where title is missing (shouldn't happen)
                    }

                })

                $timeout(function () {
                    makeTree()
                },1000)


            }
            sortDG()

            function showAllDGTree(treeData) {
                $('#ctDGTree').jstree('destroy');
                $scope.allDGTree = $('#ctDGTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,  worker: true, animation:0,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        let dgName = data.node.data.dgName


                        $scope.selectDG(hashAllDG[dgName])


                        //use the dg out of $scope.hashAllDG - not the copy in the tree data
                       // if ($scope.hashAllDG[dgName]) {
                            //  $scope.selectModel($scope.hashAllDG[dgName])
                      //  }
                    }

                    try {
                        $scope.$digest();       //as the event occurred outside of angular...
                    } catch (ex) {

                    }

                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id

                    $(this).jstree("open_node",id);



                    $scope.$digest();
                });
            }


            function makeTree() {
                let treeData = []
                let root = {id:"root",text: "DataGroups tree",parent:'#',data:{}}
                treeData.push(root)

                $scope.sortedDGList1.forEach(function (dg) {
                    let text = dg.title || dg.name
                    let parent = dg.parent || "root"
                    //temp let node = {id:dg.name,text:text,parent:parent,data:{dg:dg}}
                    let node = {id:dg.name,text:text,parent:parent,data:{dgName: dg.name}}
                    treeData.push(node)

                })

                showAllDGTree(treeData)

            }






            if (hashAllDG[currentType]) {
                //this is a DG - find the subtypes / supertypes

                //find all child nodes
                $scope.hashChildren = {}

                let addedOne = true
                while (addedOne) {
                    addedOne = false
                    Object.keys(hashAllDG).forEach(function (key) {
                        let dg = hashAllDG[key]
                        if (dg.parent) {
                            //is this a child
                            if (! $scope.hashChildren[dg.name]) {    //ignore any children we've already found
                                if (dg.parent == currentType || $scope.hashChildren[dg.parent]) {
                                    $scope.hashChildren[dg.name] = dg
                                    addedOne = true
                                }
                            }
                        }

                    })
                }
                $scope.childCount = Object.keys($scope.hashChildren).length
                console.log($scope.hashChildren)
            }
            
            $scope.viewVS = function (vs) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return vs
                        }, refsetId : function () {
                            return "unknown"
                        }
                    }

                })
            }

            //select this type to change to
            $scope.select = function () {

                let vo = {class:$scope.input.class}


                if ($scope.input.class == 'dg') {
                    vo.value = $scope.selectedDG
                } else {
                    vo.value = $scope.selectedDT
                }
                $scope.$close(vo)


            }

            $scope.selectDT = function (dt) {
                $scope.selectedDT = dt
                $scope.typeUrl = `${fhirBase}#${dt}`
            }

            $scope.selectDG = function (dg) {
                $scope.selectedDG = dg

                let allTypes = angular.copy(hashAllDG)
                for (const fhirDT of $scope.fhirTypes) {
                    allTypes[fhirDT] = fhirDT
                }



                //todo allTypes is a combination of hashAllDG & FHIR DT - could be refactored
                let vo = modelsSvc.getFullListOfElements(dg,allTypes,hashAllDG)

                $scope.cdFullElementList = modelsSvc.makeOrderedFullList(vo.allElements)
                let treeData = modelsSvc.makeTreeFromElementList($scope.cdFullElementList)
                makeDGTree(treeData)
            }

            function makeDGTree(treeData) {
                $('#cdtTree').jstree('destroy');

                let x = $('#cdtTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;

                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes



                    //console.log($("#dgTree").jstree(true).get_json('#', { 'flat': true }))
                    //console.log($("#dgTree").jstree(true).get_json('#'))

                    $scope.$digest();
                });

            }

            $scope.showDG = function(DG,filter) {
                if (filter) {

                    let show = false
                    if (DG.name && DG.name.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }
                    if (DG.description && DG.description.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }

                    return show

                } else {
                    return true
                }
            }


        })