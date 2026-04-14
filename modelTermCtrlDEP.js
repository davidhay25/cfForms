angular.module("pocApp")
    .controller('modelTermCtrl',
        function ($scope,$timeout,$uibModal) {


            $scope.viewVSDEP = function (item) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return item     //just looks at the .options property
                        }
                    }

                })
            }


            $scope.viewOptions = function (item) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'optionsCtrl',

                    resolve: {
                        ed: function () {
                            return item     //just looks at the .options property
                        },
                        readOnly : function () {
                            return true
                        }
                    }

                })
            }

            //when a specific Composition is selected in the term summary
            $scope.termSelectComp = function (item) {

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabComp
                //$scope.hashAllCompositions[item.compName]

                //select the composition - function is parent
                $scope.selectComposition($scope.hashAllCompositions[item.compName])
            }

            $scope.termSelectCompItem = function (item) {


                //set the tab to the Comp tab
                $scope.input.mainTabActive = $scope.ui.tabComp
                $scope.hashAllCompositions[item.compName]

                //select the composition - function is parent
                $scope.selectComposition($scope.hashAllCompositions[item.compName])

                $timeout(function () {

                    //let fullPath = `${item.hiddenDGName}.${item.path}`

                    $("#compositionTree").jstree("select_node",  item.path);

                    $scope.input.compTabActive = $scope.compUi.tree //make sure the tree is selected

                },500)

            }

            //when a specific DG is selected in the term summary
            $scope.termSelectDGDEP = function (item) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                $scope.selectedModel = $scope.hashAllDG[item.DGName]
                $scope.selectModel($scope.selectedModel)

            }

            //selects both a DG and an element within that DG

            $scope.termSelectDGItemDEP = function (item) {
                console.log(item)

                //set the tab to the DG tab
                $scope.input.mainTabActive = $scope.ui.tabDG;

                //locate the DG with this name and set it active. This will select it in the DG tab
                //Note that elements use a 'hidden' property to set the DG name
                $scope.selectedModel = $scope.hashAllDG[item.hiddenDGName]
                $scope.selectModel($scope.selectedModel)

                //selct the element in the DG tree. Need to wait for the tree to be built...
                $timeout(function () {
                    let fullPath = `${item.hiddenDGName}.${item.path}`

                    $("#dgTree").jstree("select_node",  fullPath);
                },500)


                /*

                //Locate the ed within the model.diff with this path
                $scope.selectedModel.diff.forEach(function (ed) {
                    if (ed.path == item.path) {
                        $scope.selectedNode = {data:{ed:ed}}
                        console.log($scope.selectedNode)
                    }

                })
*/


            }



            //hiddenDGName

        })