angular.module("pocApp")
    .controller('addEWCtrl',
        function ($scope,modelsSvc, targetED,DG,fullElementList,$timeout,$filter,codedOptionsSvc,vsSvc) {
            //ED is element definition that is the target
            //DG is the full data group
            $scope.targetED = targetED

            $scope.input = {}
            $scope.operations=["=","!=","exists"]
            $scope.input.ewOp = $scope.operations[0]

            $scope.input.ewBoolean = true       //default when adding a boolean


            let treeData = modelsSvc.makeTreeFromElementList(fullElementList)

            $timeout(function () {
                makeDGTree(treeData)
            },500)

            //display a single concept in the drop down
            $scope.showConcept = function (concept) {
                let display = concept.display || ""
                if (concept.code) {
                    display += " (" + concept.code + ")"
                }
                return display
            }

            //retrieve all the possible options for the selected CC element.
            //valueset has priority
            function getOptionsForCC(ed){


                delete $scope.options
                delete $scope.valueSet

                if (ed.valueSet) {
                    $scope.valueSet = ed.valueSet
                    $scope.options = vsSvc.getOneVS(ed.valueSet)

                } else {
                    if (ed.options) {
                        $scope.options = ed.options
                    }
                }



/*

                codedOptionsSvc.getOptionsForEd(ed).then(
                    function(vo) {
                        //set the options - may have come from option or Valueset

                        $scope.options = vo.options
                        $scope.valueSet = ed.valueSet

                        switch (vo.status) {
                            case "options" :
                                $scope.optionsMessage = "These options came from the .options element in the DG"
                                break
                            case "vs" :
                                $scope.optionsMessage = "These options came from an expansion by the Terminology Server"
                                break
                            case "not-found" :
                                $scope.optionsMessage = "The ValueSet was not found on the Terminology Server"
                                break
                            default :
                                $scope.optionsMessage = "Unknown issue expanding ValueSet"
                                break
                        }

                       // $scope.
                        console.log(vo)

                    }
                )
*/

               // return ed.options       //ie an array of conepts
            }

            $scope.addEnableWhen = function (type) {
                let vo= {}
                vo.ed = $scope.selectedED
                vo.op = $scope.input.ewOp
                switch (type) {
                    case 'cc' :
                        vo.value = $scope.input.ewValue
                        break
                    case 'bool' :
                        vo.value = $scope.input.ewBoolean == "true" ? true : false
                        break
                }

                if (vo.op == 'exists') {
                    vo.value = true
                }


                $scope.$close(vo)

            }

            //check that the seleced ed can be a controller to the target. Issues that might prevent it:
            //has a fixed value
            //it can't be a child of the element being controlled (else it can't be 'unhodden!)
            function canBeControl(ed) {

                if (ed.path == targetED.path) {
                    $scope.errorMessage = "An element can't hide itself!"
                    return false
                }

                if (ed.path.isChildPath(targetED.path)) {
                    $scope.errorMessage = "This element is a child of the one being controlled. Allowing it to be the controller would mean it could not be unhidden."
                    return false
                }


                if (ed.fixedCoding) {
                    $scope.errorMessage = "This element has a fixed Coding, so can't be a control element (as the value can't change.)"
                    return false
                }

                return true
            }

            function makeDGTree(treeData) {
                $('#dgEWTree').jstree('destroy');

                let x = $('#dgEWTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    // the node selection event...

                    delete $scope.errorMessage

                    $scope.options = []

                    $scope.selectedED = data.node.data.ed
                    if (data.node.data.ed && data.node.data.ed.type && data.node.data.ed.type[0] == 'CodeableConcept') {

                        //check that this element can be a control element
                        if (canBeControl(data.node.data.ed)) {
                            //This acts asynchronously as it may need to call the NZHTS. It sets the options directly
                            getOptionsForCC(data.node.data.ed)
                        }

                        //$scope.$digest();
                    }

                    if (data.node.data.ed && data.node.data.ed.type && data.node.data.ed.type[0] == 'boolean') {

                        //check that this element can be a control element
                        if (canBeControl(data.node.data.ed)) {

                        }

                        //$scope.$digest();
                    }


                    $scope.$digest();


                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes


                    $scope.$digest();
                });

            }


        }
    )