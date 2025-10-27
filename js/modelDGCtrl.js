//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc,modelDGSvc,$timeout,librarySvc,$http) {

            $timeout(function () {
                console.log('watchers:' + $scope.$$watchers.length);
            },5000)






            //from the conditional tab, select the element
            $scope.selectCondElement = function (displayPath) {

                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})
            }

            //$scope.linkedDG

            $scope.popoverText = function (adHoc) {

                let json = angular.toJson(adHoc,true)


                return `<pre>${json}</pre>`
            }


            //return the extract type if the type of this ed is a DG
            $scope.getExtractType = function (ed) {
                if (ed && ed.type) {
                    let type = ed.type[0]
                    let dg = $scope.hashAllDG[type]
                    if (dg && dg.type) {
                        return dg.type
                    }
                }
            }
            $scope.editAdHocExtension = function (ed,dg) {
                //element can be ed or  DG. Both have adHocExtension
                // let adHocExten
                $uibModal.open({
                    templateUrl: 'modalTemplates/adHocExtension.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'adHocExtensionCtrl',
                    resolve: {
                        currentExt: function () {
                            if (ed) {
                                return ed.adHocExtension
                            } else {
                                return dg.adHocExtension
                            }

                        },
                        currentPath : function () {
                            if (ed) {
                                return ed.path
                            } else {
                                return dg.name
                            }

                        },fullElementList : function () {
                            return $scope.fullElementList

                        },
                        canEdit : function () {
                            return $scope.canEdit()
                        }
                    }
                }).result.then(function (ext) {

                    if (ext) {
                        if (ed) {
                            let displayPath = $filter('dropFirstInPath')(ed.path)
                            for (let ed1 of $scope.selectedModel.diff) {
                                if (ed1.path == displayPath) {
                                    ed1.adHocExtension = ext
                                    break
                                }
                            }


                        } else {
                            $scope.selectedModel.adHocExtension = ext
                        }
                        $scope.makeSnapshots()

                        //rebuild fullList and re-draw the tree
                        $scope.refreshFullList($scope.selectedModel)
                    }
                })
            }

            //can a selected node be edited? Depends on userMode and checkedOut status
            $scope.canEditED = function (selectedModel,node) {
                let canEdit = false
                if (selectedModel) {
                    canEdit = $scope.canEdit(selectedModel) // true if playground mode or library mode and checked out to user

                    if ($scope.userMode == 'playground') { //additional check in playground / forms mode

                        if (node && node.data && node.data.ed) {
                            let path = $filter('dropFirstInPath')(node.data.ed.path) //path has leading DG name
                            let ar = selectedModel.diff.filter(ed => ed.path == path)
                            if (ar.length == 0) {
                                canEdit = false
                            }
                        }

                    }
                }



                return canEdit
            }


            $scope.testxquery = function (queryName) {

                $http.get(`model/namedquery/${queryName}`).then(

                    function (data) {
                        $uibModal.open({
                            //backdrop: 'static',      //means can't close by clicking on the backdrop.
                            //keyboard: false,       //same as above.
                            size : 'xlg',
                            templateUrl: 'modalTemplates/xquery.html',
                            controller: 'xqueryCtrl',
                            resolve: {
                                query: function () {
                                    return data.data
                                }
                            }
                        })
                    }, function (err) {
                        alert("Named query not found")
                    }
                )
            }

            //set the current order of the DG
            $scope.setOrderDEP = function () {
                let ar = []
                $scope.fullElementList.forEach(function (item) {
                    let path = item.ed.path
                    if (path) {
                        let shortPath = $filter("dropFirstInPath")(path)
                        ar.push(shortPath)
                    }
                })

                delete $scope.selectedModel.changes //an artifact from earlier work

                //if there's a fixed order, then remove the ordering instructions
                delete $scope.selectedModel.ordering

                $scope.selectedModel.ssOrder = ar
                alert("Order has been set on DG")
                //rebuild fullList and re-draw the tree

                $scope.makeSnapshots()
                $scope.refreshFullList($scope.selectedModel)
               // $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:displayPath})

            }

            $scope.removeOrderDEP = function () {
                delete $scope.selectedModel.ssOrder
                alert("Order has been removed from DG")

                $scope.makeSnapshots()
                $scope.refreshFullList($scope.selectedModel)
            }


            $scope.showDiff = function(filter,title) {

                if (! filter || ! title) {return true}

                let p = title.toLowerCase()

                if (p.indexOf(filter.toLowerCase()) > -1) {return true}

            }

            $scope.dependencySourceDisplay = function (ed) {
                return `${ed.path} (${ed.title})`
            }


            $scope.cloneDGDEP = function (dg) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/getName.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'getNameCtrl',
                    resolve: {
                        kind: function () {
                            return "dg"
                        }
                    }

                }).result.then(function (vo) {
                    //todo need to re-do all id's
                    //need to adjust ew - create a service that copies the DG - updating the Ids and EWs...

                    let newDG = modelDGSvc.copyDG(dg,vo)    //create a copy with id's and ew's updated
                    if ($scope.userMode == 'playground') {
                        //if in collections mode can just check the name in the DG hash
                        if (! $scope.hashAllDG[newDG.name]) {
                            addToDGList(newDG)
                        } else {
                            alert(`Sorry, this name (${vo.name}) is not unique`)
                        }

                    } else {
                        //in LIM mode need to check for uniqueness on the server
                        modelsSvc.isUniqueNameOnLibrary(vo.name,'dg').then(
                            function () {
                                newDG.checkedOut = $scope.user.email
                                newDG.author = $scope.user.email
                                addToDGList(newDG)

                                //save a copy to the Library (as we do with DGs). As it's new, it won't be downloaded
                                librarySvc.checkOut(newDG,$scope.user)

                            },function () {
                                alert(`Sorry, this name (${vo.name}) is not unique`)
                            }
                        )
                    }

                    return

                    function addToDGList(newDG) {
                        $scope.hashAllDG[newDG.name] = newDG
                        $scope.makeSnapshots()
                        $scope.makeAllDTList()  //create the various lists (and trees) for the dt list
                        $scope.$emit('updateDGList',{name:newDG.name})
                    }
/*
                    modelsSvc.isUniqueNameOnLibrary(vo.name,'dg').then(
                        function () {
                            let newDG = angular.copy(dg)
                            newDG.name = vo.name
                            newDG.title = vo.title
                            newDG.description = vo.description
                            newDG.checkedOut = $scope.user.email
                            newDG.author = $scope.user.email

                            //save a copy to the Library (as we do with DGs). As it's new, it won't be downloaded
                            librarySvc.checkOut(newDG,$scope.user)
                            traceSvc.addAction({description:`Checkout as part of DG clone ${newDG.name}`,
                                action:"checkout",
                                model:newDG})


                            //Any elements that have 'enableWhen' elements need to have  the source element
                            //updated as the first segment may refer to the old DG name
                            let oldName = dg.name
                            let newName = vo.name

                            if (newDG.diff) {
                                newDG.diff.forEach(function (ed) {
                                    if (ed.enableWhen) {
                                        ed.enableWhen.forEach(function (ew) {
                                            let ar = ew.source.split('.')
                                            if (ar[0] == oldName) {
                                                ar[0] = newName
                                                ew.source = ar.join('.')
                                            }
                                        })
                                    }
                                })
                            }



                            $scope.hashAllDG[newDG.name] = newDG

                            $scope.makeSnapshots()

                            traceSvc.addAction({action:'clone-model',model:newDG})

                            $scope.makeAllDTList()  //create the various lists (and trees) for the dt list

                            $scope.$emit('updateDGList',{name:newDG.name})

                        }, function() {
                            alert(`Sorry, this name (${vo.name}) is not unique`)
                        }
                    )

                    */
                })
            }



            $scope.deleteDGDiff = function (inx) {

                //check that this isn't a parent
                let diffToDelete = $scope.selectedModel.diff[inx]
                for (const diff of $scope.selectedModel.diff) {
                    //if (diff.path !== diffToDelete.path && diff.path.startsWith(diffToDelete.path)) {
                    if (diff.path.isChildPath(diffToDelete.path)) {
                        alert(`This diff has child elements so can't be removed (${diff.path})`)
                        return
                    }
                }

                if (confirm("Are you sure you wish to remove this element? It will effectively be removed from all children (unless they have overriden it)")) {
                    //traceSvc.addAction({action:'delete element',model:$scope.selectedModel,description:"From diff display"})

                    let pathToDelete = $scope.selectedModel.diff[inx].path
                    $scope.selectedModel.diff.splice(inx,1)



                    $scope.makeSnapshots()
                    $scope.refreshFullList($scope.selectedModel)

                    $scope.termSelectDG({DGName:$scope.selectedModel.name})
                }
            }



            //check out the current DG
            $scope.checkOut = function () {

                librarySvc.checkOut($scope.selectedModel,$scope.user,function (dg) {
                    //returns the DG downloaded from the library
                    if (dg) {
                        $scope.hashAllDG[dg.name] = dg

                        $scope.makeSnapshots()

                       // $timeout(function () {
                            $scope.selectModel(dg)      //in modelsCtrl
                       // },500)

                    }
                })

            }

            $scope.checkIn = function () {
                librarySvc.checkIn($scope.selectedModel,$scope.user)

            }

            $scope.revert = function () {
                if (confirm("Are you sure you wish to revert and lose any changes you have made?")) {

                    librarySvc.revert($scope.selectedModel, $scope.user).then(
                        function (data) {
                            //returns the model from the library
                            $scope.hashAllDG[$scope.selectedModel.name] = data
                            $scope.makeSnapshots()


                            $scope.$emit('updateDGList',{name:$scope.selectedModel.name})

                            alert("Check out has been cancelled, and the Library version of this DG downloaded.")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }

            $scope.showHistory = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/history.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: 'historyCtrl',

                    resolve: {
                        name: function () {
                            return $scope.selectedModel.name
                        },
                        category: function () {
                            return "dg"
                        },
                        currentModel : function () {
                            return $scope.selectedModel
                        }
                    }
                })
            }


            $scope.addEWNew = function () {
                //create a new function to add an EW is now a separate modal

                $uibModal.open({
                    templateUrl: 'modalTemplates/addEW.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'addEWCtrl',
                    resolve: {
                        targetED: function () {
                            //The ED that will be controlled - thos one
                            return $scope.selectedNode.data.ed
                        },
                        DG: function () {
                            //the full datagroup
                            return $scope.selectedModel
                        },
                        fullElementList : function () {
                            return $scope.fullElementList
                        }
                    }

                }).result.then(function (vo) {
                    //$scope.selectedModel.dirty = true
                    $scope.addEnableWhen({ed:vo.ed},vo.value,vo.op)

                    //need to re-build the key elements
                    $scope.makeSnapshots()
                    $scope.refreshFullList($scope.selectedModel)
                    let path = $filter('dropFirstInPath')($scope.selectedNode.data.ed.path)
                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:path})

                })
            }

            //add an enableWhen within the scope of the current DG. Assume (for now) that the trigger is a coded value
            //value is assumed to be a Coding todo - we now support boolean
            //Still used - called from $scope.addEWNew() above
            $scope.addEnableWhen = function(item,value,op) {
                //item is the controlling ed - the one whose value will hide/show the currently selected element

                op = op || '='
                //let sourcePath = item.shortPath       //this is the path of the source

                let sourcePath = item.ed.path       //the controlling ED path. THIS MUST BE THE FULL PATH includeing DG name
                let sourceId = item.ed.id       //the id of the ed
                //let targetPath =$scope.selectedNode.data.ed.path
                let targetPath = $filter('dropFirstInPath')($scope.selectedNode.data.ed.path)  //the currently selected ED - the one that will be controlled
                let targetED = $scope.selectedNode.data.ed  //this ED - the one that will be shown / hidden


                //todo - what if there is no diff
                let found = false
                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == targetPath) {
                        found = true
                        ed.enableWhen = ed.enableWhen || []
                        let ew = {source:sourcePath,sourceId: sourceId,operator:op,value:value}
                        //let ew = {source:sourcePath,sourcePathId: sourcePathId,operator:op,value:value}
                        ed.enableWhen.push(ew)

                        //traceSvc.addAction({action:'add-enablewhen',model:$scope.selectedModel,path:targetPath,description:'edit diff'})
                        break
                    }
                }

                if (! found) {
                    let diffEd = angular.copy(targetED)     //this is a copy of the 'source' - which will be hidden
                    diffEd.path = targetPath
                    diffEd.enableWhen = item.ed.enableWhen || []
                    let ew = {source:sourcePath,sourceId: sourceId,operator:op.value,value:value}
                    //let ew = {source:sourcePath,sourcePathId: sourcePathId,operator:"=",value:value}
                    diffEd.enableWhen.push(ew)
                    $scope.selectedModel.diff.push(diffEd)
                   // traceSvc.addAction({action:'add-enablewhen',model:$scope.selectedModel,path:targetPath,description:'add diff'})
                }

                //delete $scope.input.ewSourceValue
                //delete $scope.input.ewSource
                //in modelsCtrl

                //needed to re-draw the UI
                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:targetPath})

            }

            $scope.removeEnableWhen = function (inx,path) {


                if (! confirm("Are you sure you wish to remove this Conditional show")) {
                    return
                }
                //the path is the full path (incl. DGName) of the element where the EW is to be removed from.
                //inx is the position within the array of EW
                //First, see if this path is present in the diff...
                let updated = false
                let pathInDG = $filter('dropFirstInPath')(path) //the path in the DG doesn't have the DF type name in front
                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == pathInDG) {
                        //yes, it is in the diff
                        updated = true      //we definately don't want to add another
                        if (ed.enableWhen && ed.enableWhen.length > inx) {
                            let ew = ed.enableWhen.splice(inx,1)


                            break
                        } else {
                            alert(`The remove index was ${inx} but the enableWhen length is only ${ed.enableWhen.length}. Not removed`)
                        }

                    }
                }

                if (! updated) {
                    //the EW must be inherited. We need to add a diff to take it out.
                    let ed = angular.copy($scope.selectedNode.data.ed)
                    if (ed.enableWhen && ed.enableWhen.length > inx) {
                        //can't imagine why it wouldn't be...
                        ed.enableWhen.splice(inx, 1)
                    }

                    ed.path = $filter('dropFirstInPath')(ed.path)
                    $scope.selectedModel.diff.push(ed)
                }

                //need to re-build the key elements
                $scope.makeSnapshots()
                $scope.refreshFullList($scope.selectedModel)
                //in modelsCtrl
                $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:path})
/*
                $timeout(function () {
                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:path})
                },1000)

*/

            }


            //is this element able to be sliced
            $scope.canSlice = function (ed) {
                if ($scope.userMode == 'playground') {
                    return false
                }

                if (ed && ed.mult) {
                    //must be multiple
                    if (ed.mult.indexOf('..*')  == -1 ) {
                        return false
                    }

                    //Must be a diff with entries - ie a DG not a DT
                    let type = ed.type[0]
                    let dg = $scope.hashAllDG[type]
                    if (dg && dg.diff.length > 0) {
                        return true
                    }

                    //A group can be resliced
                    if (type == 'Group'  &&  ed.originalType && ed.originalType.length > 0) {
                        return true
                    }
                }

            }

            //slicing makes a copy of the ed and adds it as a child
            //note that the path in the ed includes the dg name
            //limit slicing to DG's - ie with a .diff  If we need to slice, say, identifiers then make an Identifier DG
            $scope.slice = function (ed) {
                let sliceName = prompt("Enter the name for the slice (no spaces). It will become a child of this one. Esc to exit.")
                if (sliceName) {

                    if (sliceName.split(' ').length > 1) {
                        alert("Spaces are not allowed")
                        return
                    }

                    let clone = angular.copy(ed)  //copy to insert
                    clone.id = utilsSvc.getUUID()   //replace the id with a new one. But ids within the clone remain (eg for EW's in the ed)
                    let basePath = $filter('dropFirstInPath')(ed.path)
                    let newPath = `${basePath}.slice:${sliceName}`

                    //make sure this isn't a duplicate path
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == newPath) {
                            alert("This slice name has been used before. Try again.")
                            return
                            break
                        }
                    }

                    clone.path = newPath
                    clone.title = sliceName //`Slice ${sliceName} from ${basePath}`
                    clone.mult = "0..1"         //set to single, optional

                    //if the ed has already been sliced, then originalType saves what it was before setting to group
                    if (ed.originalType) {
                        clone.type = ed.originalType
                    }
                    clone.slicedFrom = ed.path      //link back to edlement that was sliced . So we know it's a slice, and what of
                    //console.log(clone)

                    $scope.selectedModel.diff.push(clone)

                    //traceSvc.addAction({action:'add-slice',path:newPath,model:$scope.selectedModel})

                    //also need to change the type of the element that was sliced. hmmm.
                    //what happens if sliced twice - original dt lost? ?store original??

                    if (! ed.originalType) {
                        ed.originalType = ed.type
                    }

                    //set the type of the element being sliced to group
                    ed.type = ['Group']

                    //update the selectedModel
                    //if you're slicing an inherited path, will need to add an override element
                    let inx = -1
                    let found

                    //see if there is an entry in the diff for this element. If there is,
                    //then remove it and replace it with the new one
                    let shortPath = $filter('dropFirstInPath')(ed.path)

                    for (const ed1 of $scope.selectedModel.diff) {
                        inx++
                        if (ed1.path == shortPath) {
                            ed.path = shortPath
                            $scope.selectedModel.diff.splice(inx,1,angular.copy(ed))
                            found = true
                            break
                        }
                    }

                    //it wasn't there, so add it to the diff
                    if (! found) {
                        ed.path = $filter('dropFirstInPath')(ed.path)
                        $scope.selectedModel.diff.push(ed)

                      //  let length = $scope.selectedModel.diff.length
                      //  $scope.selectedModel.diff.splice(length-1,0,angular.copy(ed))
                    }

                    //as we've changed the type of the sliced element from (whatever it was) to Group
                    //we need to make sure that any child elements from the parent have a 0..0 override
                    //otherwise they 'bleed' through... They will be in the full element list
                    let hash = {}   //create a hash of existing diff elements by path so we don't duplicate
                    $scope.selectedModel.diff.forEach(function (ed) {
                        hash[ed.path] = ed
                    })

                    for (const thing of $scope.fullElementList) {
                        let ed = thing.ed
                        //if the path is alreadt a slice then leave it alone!
                        if (ed.path && ed.path.indexOf('slice:') == -1) {
                            let shortPath = $filter('dropFirstInPath')(ed.path)
                            if (shortPath.isChildPath(basePath)) {
                                if (hash[ed.path]) {
                                    //There's already a diff entry - set the mult -> 0..0
                                    hash[ed.path].mult = '0..0'
                                } else {
                                    //need to add an override diff
                                    let clone = angular.copy(ed)
                                    clone.path = shortPath
                                    clone.mult = '0..0'
                                    $scope.selectedModel.diff.push(clone)
                                }
                            }
                        }


                    }

                    $scope.makeSnapshots()

                    //rebuild fullList and re-draw the tree
                    $scope.refreshFullList($scope.selectedModel)

                    $scope.termSelectDGItem({hiddenDGName:$scope.selectedModel.name,path:newPath})


                }

            }



            $scope.setControlHint = function(ed,value) {
                let path = $filter("dropFirstInPath")(ed.path)
                for (const ed1 of  $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        ed1.controlHint = value
                        $scope.selectedNode.data.ed.controlHint = value  //so the Json is updated
                        break
                    }
                }
            }



            //delete the selected item. If the item exists in the DG then it can be removed. Don't set the mult to 0..0 as this prevents a new element with that path
            //if not (ie it's inherited) then create an override element
            $scope.deleteDGItem = function (item) {
                let ar = item.path.split(".")       //this i sthe full path - with prepended dg name
                let dgName = ar[0]      //so the DG name is the first segment (should be the same as selectedModel

                let dg = $scope.hashAllDG[dgName]
                ar.splice(0,1)          //remove the first element (the dg name)
                let pathToDelete =  ar.join(".") // $filter('dropFirstInPath')(item.path)   //remove the DT name from the path


                //this is a special case involving sliced elements. In this case we physically remove the path and all children from the diff
                if (item.path.indexOf('.slice:') > -1) {
                    let slicePathToDelete = ar.join('.')        //the full element to delete - without the dg name at the front
                    if (confirm("Do you want to remove this slice and all it's contents")) {

                        //let dg = $scope.hashAllDG[dgName]
                        if (dg && dg.diff) {
                            let ar1 = []
                            dg.diff.forEach(function (ed) {
                                if (ed.path.indexOf(slicePathToDelete) == -1) {
                                    ar1.push(ed)
                                }

                            })
                            dg.diff = ar1

                            //rebuild fullList and re-draw the tree
                            $scope.refreshFullList($scope.selectedModel)
                        }
                    }
                    return
                }

                //check that this element isn't a source element for a conditional
                for (const thing of $scope.fullElementList) {
                    let ed = thing.ed    //note the ed path has the dg name prefix in fullElementList
                    if (ed.enableWhen) {
                       // let source = `${dg.name}.${ed.path}`
                        for (const ew of ed.enableWhen) {
                            if (ew.source == item.path) {
                                alert(`This element is a controlling element (conditional) for ${ed.path} so can't be deleted`)
                                return
                                break
                            }
                        }

                    }
                }


                //check that there aren't any child elements off this one
                let canDelete = true
                //let dg = $scope.hashAllDG[dgName]
                if (dg && dg.diff) {
                    dg.diff.forEach(function (ed) {

                        if (ed.path.isChildPath(pathToDelete))  {  //Is this ed a child of the path to delete?
                        //if (ed.path.startsWith(pathToDelete + ".") && ed.path !== pathToDelete) { //don't want it matching on itself!
                            if (ed.mult !== '0..0') {
                                //if the child is deleted, then it's safe to delete this one... todo - this will leave the child an orphan...
                                canDelete = false
                            }

                        }
                    })

                } else {
                    alert(`DG ${dgName} cannot be found, or has no diff. You'll need to reset.`)
                    return
                }



                if (! canDelete) {
                    alert("You must delete any child nodes first.")
                    return
                }

                if (! confirm(`Are you sure you wish to delete this element: ${pathToDelete}`)) {
                    return
                }

                let inx = -1
                let ctr = -1
                //let changes = []    //this is the list of changes

                //is the path in the DG diff? (or is it inherited from an ancestor)
                for (const ed1 of $scope.selectedModel.diff) {
                    ctr ++
                    if (ed1.path == pathToDelete) {
                        inx = ctr
                        break
                    }
                }

                if (inx > -1) {
                    //set the mult to 0..0


                    //don't delete any more - set the mult.
                    //$scope.selectedModel.diff.splice(inx,1)
                    $scope.selectedModel.diff[inx].mult = '0..0'


                } else {
                    //The attribute that was edited (eg edscription) is inherited
                    //Need to create an 'override' element and add to the DG

                    //set the minimum required elements..
                    let ed = {path:pathToDelete,mult:"0..0",type:item.type,title:item.title,description:item.description}


                    //let ed = {path:pathToDelete,mult:"0..0",type:['string'],title:item.titl}}
                    $scope.selectedModel.diff.push(ed)

                }


                $scope.makeSnapshots()


                //rebuild fullList and re-draw the tree
                $scope.refreshFullList($scope.selectedModel)




            }

            //return true if the datatype can have a fixed or default value
            $scope.isFixedType = function (ed) {
                if (ed && ed.type) {
                    let type = ed.type[0]       //only look at the first
                    if (type == 'CodeableConcept' || type == 'Quantity' || type == 'Ratio' || type == 'code') {
                        //if (type == 'CodeableConcept' || type == 'decimal' || type == 'string') {
                        return true
                    }
                }
            }

            //locate the model where this item was defined
            //todo - this could be removed after refactoring
            $scope.getSourceModelName = function (ed) {

                if (ed) {
                    return ed.sourceModelName
                }


            }

            $scope.expandDTTree = function () {
                $('#dgTree').jstree('open_all');
            }

            $scope.editDGOptionsList = function (ed,readOnly) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    controller: 'optionsCtrl',
                    resolve: {
                        ed: function () {
                            return ed
                        },
                        readOnly : function () {
                            //return readOnly
                            return true
                        }
                    }

                }).result.then(function (updatedEd) {
                    //need to update the .diff in the selected model

                    let found = false
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.options = updatedEd.options
                           // traceSvc.addAction({action:'set-options',model:$scope.selectedModel,path:p,description:`edit diff`})
                            found = true

                            break
                        }
                    }

                    if (! found) {
                        //Need to create an 'override' element and add to the DG

                        //remove the type name
                        updatedEd.path = $filter('dropFirstInPath')(updatedEd.path)
                        $scope.selectedModel.diff.push(updatedEd)

                    }



                })
            }




    })