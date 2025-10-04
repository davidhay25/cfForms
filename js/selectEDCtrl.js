angular.module("pocApp")
    .controller('selectEDCtrl',
        function ($scope,DG,$http,modelsSvc,insertNode,$filter,viewVS,utilsSvc) {

            $scope.linkedDGName = DG.linkedDG

            //create a list of all current children of the node where these items are to be inserted.
            //Don't insert anything with the same name
            let currentChildren = []

            let currentPath = $filter('dropFirstInPath')(insertNode.data.ed.path)  //this is the full path with the DG name as a prefix, so drop the DF name

            for (let ed of DG.diff) {
                let path = ed.path  //no DG prefix
                if (path.startsWith(currentPath + '.') ) {
                    //console.log(path)
                    let newPath = path.replace(currentPath + '.',"")
                    //console.log(newPath)
                    let ar = newPath.split('.')
                    currentChildren.push(ar[0])
                }
            }


            $scope.input = {selected:{},newPath:{}};


            $http.get(`frozen/${$scope.linkedDGName}`).then(
                function (data) {
                    $scope.linkedDG = data.data

                    let arElements = []
                    let rootEd = {name:$scope.linkedDG.name,title:$scope.linkedDG.title, path:$scope.linkedDG.name}
                    arElements.push({ed:rootEd})  //the root

                    for (const ed of $scope.linkedDG.diff) {
                        ed.path = `${$scope.linkedDG.name}.${ed.path}`
                        arElements.push({ed:ed})
                    }

                    let treeData = modelsSvc.makeTreeFromElementList(arElements)
                    drawDGTree(treeData)


                }, function (err) {
                    alert (angular.toJson(err.data))
                }
            )

            $scope.viewVS = function (url) {
                viewVS(url)
            }

            $scope.save = function () {


                let arSelected = []

                //set the path to the last segment, checking for dups
                //let hashPath = {}
               // let dups = []
                if ($scope.selectedED) {

                    for (const ed of $scope.selectedED) {
                        if (ed.type) {  //'real' eds have a type
                            if (! ed.isDupPath) {
                                ed.pathInSource = ed.path
                                ed.path = ed.newPath
                                ed.id = ed.id || utilsSvc.getUUID()
                                delete ed.dupPath
                                arSelected.push(ed)
                            }

                        }

                    }
                }



                //check the ed - eg remove enableWhen, conditionalVS
                checkForIssues(arSelected,true)

                $scope.$close(arSelected)
            }

            function drawDGTree(treeData) {
                //enable drag / drop for re-ordering


                $('#selectTree').jstree('destroy');



                let x = $('#selectTree').jstree(
                    {
                        'core': {
                                'multiple': true,
                                'animation': 1,
                                'data': treeData,
                                'themes': {name: 'proton', responsive: true}
                            },
                        plugins:['checkbox']
                    }


                ).on('select_node.jstree', function (e, data) {

                    makeSelectedList()
                    $scope.edForJsonDisplay = data.node.data.ed

                    $scope.$digest();       //as the event occurred outside of angular...

                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    //$(this).jstree("open_node",id);
                    $(this).jstree("open_all");  //open all nodes

                    $scope.$digest()
                }).on('deselect_node.jstree', function (e, data) {
                    makeSelectedList()
                    delete $scope.edForJsonDisplay


                    $scope.$digest();       //as the event occurred outside of angular...


                })




            }

            function makeSelectedList() {
                $scope.issues = []
                let selectedIds = $('#selectTree').jstree('get_selected');
                $scope.selectedED = []


                selectedIds.forEach(function (id) {
                    let node = $('#selectTree').jstree('get_node', id)
                    let ed = node.data.ed
                    //newPath will be the path in the inserted elements
                    if (! ed.newPath) {
                        let ar = ed.path.split('.')
                        ed.newPath = ar[ar.length-1]
                        $scope.input.newPath[ed.path] = ed.newPath
                    }

                    let canAdd = true

/* todo - do this when saving
                    //if the last element of the path is in the 'current' list then don't add...
                    let segment = $filter('lastInPath')(ed.path)

                    if (currentChildren.indexOf(segment) > -1) {
                        $scope.issues.push(`${ed.path} already in DG`)
                        canAdd = false
                    }
*/
                    if (! ed.type) {
                        $scope.issues.push(`${ed.path} has no type`)
                        canAdd = false
                    }

                    if (ed.type && ed.type[0] == 'Group') {
                        $scope.issues.push(`${ed.path} is a group and isn't added`)
                        canAdd = false
                    }


                    if (canAdd) {
                        $scope.selectedED.push(ed)
                    }

                })

                checkForDups($scope.selectedED)
                checkForIssues($scope.selectedED)
                //console.log($scope.selectedED)
            }

            $scope.changePathHandler = function (ed) {
                //ed.newPath = input.newPath[ed.path]
                ed.newPath = $scope.input.newPath[ed.path]
                checkForDups($scope.selectedED)
            }

            function checkForDups(lst) {
                let hash = {}

                //create a hash of the number of times a newPath is used
                for (const ed of lst) {
                    if (hash[ed.newPath]) {
                        hash[ed.newPath] ++
                    } else {
                        hash[ed.newPath] = 1
                    }
                }




                //set the
                for (let ed of lst) {
                    ed.isDupPath = false
                    //duplicates in this selection
                    if (hash[ed.newPath] > 1) {
                        ed.isDupPath = true
                    }

                    //dup from parent
                    if (currentChildren.indexOf(ed.newPath) > -1) {
                        ed.isDupPath = true
                    }

                }



            }

            function checkForIssues(lst,clean) {

                return  //not checking for anything at the moment


                for (let ed of lst) {

                    if (false && ed.enableWhen) {
                        let iss = `${ed.path} has conditionals (EnableWhen) set which will be disabled.`
                        for (const ew of ed.enableWhen) {
                            iss += `Conditional on ${ew.source}`
                        }
                        $scope.issues.push(iss)

                        if (clean) {
                            addIssue(ed,ed.enableWhen)
                            delete ed.enableWhen
                        }

                    }

                    if (false && ed.conditionalVS) {
                        let iss = `${ed.path} has conditional ValueSets which will be disabled.`
                        $scope.issues.push(iss)
                        if (clean) {
                            addIssue(ed,ed.conditionalVS)
                            delete ed.conditionalVS
                        }
                    }



                    //conditional vs
                }

                function addIssue(ed,iss) {
                    ed.issues = ed.issues || []
                    ed.issues.push(iss)
                }

            }

        }
    )