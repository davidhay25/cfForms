//functions used in re-ordering elements.
angular.module("pocApp")

    .service('orderingSvc', function($filter) {

        return {

            adjustGroupOrderingDEP(dg) {
                //ensure that the 'children' of group elements are immediately after the 'parent'. The tree is OK, but the lists are wrong...
                //NOTE: assume only a single level of group elements
                //first create a new diff list that excludes group children
                let hash = {}       //will have all the group children
                let lst = []        //will be the new diff
                for (const ed of dg.diff) {

                    let ar = ed.path.split('.')
                    if (ar.length == 1) {
                        //this is an 'ordinary' element
                        lst.push(ed)
                    } else {
                        //this is a group child
                        let root = ar[0]
                        hash[root] = hash[root] || []
                        hash[root].push(ed)
                    }
                }

                //now we can insert all the group children
                for (const groupName of Object.keys(hash)) {
                    let itemsToInsert = hash[groupName]
                    //find the location of the group parent
                    for (let i=0; i< lst.length; i++) {
                        let tEd = lst[i]
                        if (tEd.path == groupName) {
                            Array.prototype.splice.apply(lst, [i+1, 0].concat(itemsToInsert));
                            //insertPointFound = true
                            break
                        }
                    }

                }

                return lst



            },


            sortFullListByInsertAfter(lst,dg,hashAllDG) {
                //perform the actual re-ordering. update lst
                let lstOrdering = []

                if (! dg) {
                    return
                }

                if (dg.ordering && dg.ordering.length >0) {
                    //there is ordering defined on the DG
                    lstOrdering = dg.ordering
                } else {
                    if (! dg.ssOrder) {
                        //the DG has no ordering defined directly.
                        //walk up the inheritance chain until we find a parent with ordering (if any)
                        //but only if there is no ssOrder defined
                        let tmpDG = dg
                        let keepGoing = true
                        let ctr = 0         // a counter to trap any infinate recursion error. probably unneeded
                        while (tmpDG.parent && keepGoing) {
                            let dgTitle = tmpDG.title
                            let parent = tmpDG.parent
                            tmpDG = hashAllDG[parent]
                            if (! tmpDG) {
                                alert(`DG ${parent} was not found. Referenced in ${dgTitle}`)
                                return
                            }

                            if (tmpDG.ordering && tmpDG.ordering.length > 0) {
                                lstOrdering = tmpDG.ordering
                                keepGoing = false       //to stop the recursion
                            }

                            ctr++
                            if (ctr > 100) {
                                keepGoing = false
                                alert(`Error finding ultimate parent of ${dg.name} - recursion issue most likely`)
                                return
                            }
                        }
                    }
                    }


                if (lstOrdering.length == 0) {
                    //no ordering list was found in the DG or parental hierarchy
                    return
                }

                lstOrdering.forEach(function (item) {
                    let insertPointFound = false


                    //remove the first segment in the path - this is the DG name
                    let toMove = $filter('dropFirstInPath')(item.toMove)

                    //if this is the root, then don't strip the 'first' segment
                    let insertAfter = item.insertAfter
                    if (item.insertAfter.indexOf('.') > -1) {
                        insertAfter = $filter('dropFirstInPath')(item.insertAfter)
                    }


                    //find the number of elements that start with the item to moves path
                    //todo - can't use 'startswith' - has to be segment aware (BodySite.bodypart)
                    let cnt = 1  //-- will be the number to move, including the actual toMove (assuming it's found)
                    lst.forEach(function (item1) {
                        //is item1 a child of the element to move
                        let pth = $filter('dropFirstInPath')(item1.ed.path)
                        if (pth.isChildPath(toMove)) {
                            cnt++
                        }
                    })

                    console.log(`${toMove} has ${cnt} elements to move`)

                    let currentPos = findCurrentPositionInList(toMove)  //current position of the element to move

                    if (currentPos > -1) {
                        //cnt++   //the cnt does not include the element to move.
                        //remove the items and save in array for insertion later
                        let itemsToMove = lst.splice(currentPos,cnt)

                        //now find the insertion point
                        let foundIt = false


                        //Feb26 - if the insertAfter is the DG name, then it's being moved to the top

                        if (insertAfter == dg.name) {

                            Array.prototype.splice.apply(lst, [1, 0].concat(itemsToMove));
                            insertPointFound = true

                        } else {
                            //otherwise we need to find the insert point...
                            for (let i=0; i< lst.length; i++) {
                                let tItem = lst[i]
                                if ($filter('dropFirstInPath')(tItem.ed.path) == insertAfter) {

                                    //sep 3 - need to move past any child elements of this path
                                    foundIt = true
                                    console.log(`found at ${i}`)

                                } else if (foundIt) {
                                    let pth = $filter('dropFirstInPath')(tItem.ed.path)

                                    if (! pth.isChildPath(insertAfter)) {
                                        console.log(`Inserting at ${i}`)
                                        Array.prototype.splice.apply(lst, [i, 0].concat(itemsToMove));
                                        insertPointFound = true
                                        break
                                    }
                                }
                            }
                        }


                        if (! insertPointFound) {
                            console.error(`Insert point ${item.insertAfter} not found, no re-ordering occurred`)
                            //we need to put them back
                            for (let i = itemsToMove.length-1; i > -1; i--) {
                                lst.splice(currentPos,0,itemsToMove[i])
                            }
                        }
                    }


                })

                function findCurrentPositionInList(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    //ignores the first segment




                    let pos = -1
                    for (const item of lst) {
                        pos ++
                        if ($filter('dropFirstInPath')(item.ed.path) == path) {
                            break
                            //return pos
                        }
                    }
                    return pos
                }

            },

            getOrderingByToMove(dg) {
                //create a hash by source path for elements that are moved.
                let hash = {}

                if (dg && dg.ordering) {
                    dg.ordering.forEach(function (ord) {
                        hash[ord.toMove] = hash[ord.toMove] || []
                        hash[ord.toMove].push(ord.insertAfter)



                    })
                }
                return hash
            },
            getOrderingForReferencesDEP(lst,dg,hashAllDG) {
                let ar = []
                //get the ordering info for referenced datagroups - if they are not in the dg
                //directly referenced only

                //create a hash of move instructions that already exist. To avoid dups...
                let hash = {}
                if (dg.ordering) {
                    dg.ordering.forEach(function (ord) {
                        hash[ord.toMove+ord.insertAfter] = true
                    })
                }

                lst.forEach(function (item) {
                    let ed = item.ed

                    if (ed.type) {
                        let type = ed.type[0]
                        let refDG = hashAllDG[type]     //the referenced dg
                        if (refDG && refDG.ordering) {

                            refDG.ordering.forEach(function (ord) {

                                let toMove = ed.path + "." + $filter('dropFirstInPath')(ord.toMove)
                                let insertAfter = ed.path + "." + $filter('dropFirstInPath')(ord.insertAfter)

                                //now make sure that this move instruction is not yet in the dg ordering

                                if (! hash[toMove+insertAfter]) {
                                    let item = {path:ed.path,toMove:toMove,insertAfter:insertAfter}
                                    ar.push(item)
                                }

                            })

                            //console.log(ed.path,type, hashAllDG[type].ordering)

                        }
                    }

                })
                return ar
            },

            createMoveFromReferences(lst,dg,hashAllDG) {
                //create a set of move instructions based on all the ordering in the referenced DGs
                //iterate over the full list of elements. If the element refers to a DG (ie the type is found in the hashAllDG)
                //then look for any move instructions on the referenced DG. If any are found, then adjustthe paths and add them
                //to the main DG

                //create a hash of the current move instructions keyed on 'toMove'
                let hashCurrentMoves = {}
                if (dg.ordering) {
                    for (const move of dg.ordering){
                        hashCurrentMoves[move.toMove] = move.insertAfter
                    }
                }

                let arMove = []     //will be a list of move instructions extracted from referenced DGs
                for (const item of lst) {
                    let ed = item.ed

                    if (ed && ed.type) {
                        let path = ed.path
                        let type = ed.type[0]
                        let referencedEd = hashAllDG[type]  //is this a reference to a DG?
                        if (referencedEd) {                 //yes, it is
                            //console.log(referencedEd)
                            if (referencedEd.ordering) {    //does it have any ordering
                               // console.log(path,referencedEd.ordering)
                                for (const item of referencedEd.ordering) { //iterate over them and add to the list

                                    let toMove = item.toMove            //includes the DG name in the path
                                    let insertAfter = item.insertAfter  //includes the DG name in the path unless moving to the top (will only have DG name)
                                    let adjustedToMove
                                    let adjustedInsertAfter
                                    let moveInstruction = {toMove:toMove, insertAfter:insertAfter,dgName:type}
                                    if (insertAfter == type) {
                                        //if insertAfter is the referenced DG name, then it means the element is being moved to the top
                                        //the adjusted insertAfter becomes the path
                                        moveInstruction.iaType = 'top'
                                       // console.log('insertAfter = type (move to top)')
                                        adjustedToMove = `${path}.${$filter('dropFirstInPath')(toMove)}`
                                        //adjustedInsertAfter = `${path}.${insertAfter}`
                                        adjustedInsertAfter = `${path}`
                                    } else {
                                       // console.log('insertAfter = element')
                                        moveInstruction.iaType = 'element'
                                        //otherwise, the insert after is another element withing the referenced DG
                                        adjustedToMove = `${path}.${$filter('dropFirstInPath')(toMove)}`
                                        adjustedInsertAfter = `${path}.${$filter('dropFirstInPath')(insertAfter)}`
                                    }
                                    moveInstruction.adjToMove = adjustedToMove
                                    moveInstruction.adjInsertAfter = adjustedInsertAfter
                                    if (hashCurrentMoves[adjustedToMove] == adjustedInsertAfter) {
                                        moveInstruction.alreadyInDG = true
                                    }




                                    arMove.push(moveInstruction)


                                }
                            }
                        }
                    }





                }
                //console.log(arMove)
                return arMove

            },

            sortFullListByInsertAfterDEP(lst) {
                //console.log(lst)
                let dgName = lst[0].ed.path     //the DGName is the first element

                //get the list of elements that need to be ordered. todo - may need to think of some kind of precedence if there are multiple
                let arToBeOrdered = []

               // let listOfTargets = []  //all the elements that are targets of a move


                lst.forEach(function (item) {
                    if (item.ed && item.ed.insertAfter) {
                        arToBeOrdered.push(item)
                       // listOfTargets.push(item.ed.insertAfter)
                    }
                })
/*
                //now, change the order of moves so that items that are targets of others are the first to be moved
                let newListToBeOrdered = []
                arToBeOrdered.forEach(function (item) {

                   // if (item.pat)
                })
*/
                console.log(arToBeOrdered)

                arToBeOrdered.forEach(function (item) {
                    let preceding = item.ed.insertAfter        //the path of the item that the item should be inserted after

                    let insertPointFound = false
                    let ar = preceding.split('.')

                    //the
                    ar.splice(0,1)
                    let endOfPath = ar.join('.')     //the path without the datatype name

                    //set the first segment to the DG name
                    ar[0] = dgName
                    preceding = ar.join('.')

                    let currentPos = findCurrentPositionInList(item.ed.path)    //where the item to be moved is currently placed

                    for (let i=0; i< lst.length; i++) {
                        let tItem = lst[i]
                        if (tItem.ed.path.endsWith(endOfPath)) {
                        //if (tItem.ed.path == preceding) {
                            //this is the point to move the item to
                            console.log(i)
                            //first, remove the item from the tree
                            let itemToMove = lst.splice(currentPos,1)       //OK, it's removed

                            if (currentPos < i) {
                                //if the item to be moved is above the insertion point, then slicing it out means we need to adjust the insertion point
                                i--
                            } else {
                                i++
                            }

                            //now insert it into the tree at 'i' - todo need to check if itemToMove is above or below insert point
                            lst.splice(i,0,itemToMove[0])
                            insertPointFound = true
                            break

                        }
                    }
                    if (! insertPointFound) {
                        console.log(`Insert point ${preceding} not found, noi re-ordering occurred`)
                    }

                })

                function findCurrentPositionInList(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    let pos = -1
                    for (const item of lst) {
                        pos ++
                        if (item.ed.path == path) {
                            return pos
                        }
                    }
                }

            },

            sortDGTreeDEP : function(treeData) {
                //re-order the tree based on the 'insert after
                //best to do this on the sorted list as other displays (like table) are updated

                //get the list of elements that need to be ordered. todo - may need to think of some kind of precedence if there are multiple
                let arToBeOrdered = []
                treeData.forEach(function (item) {
                    if (item.data.ed && item.data.ed.insertAfter) {
                        arToBeOrdered.push(item)
                    }

                })

                console.log(arToBeOrdered)

                //now go through each of the items to find the one it should be inserted after
                arToBeOrdered.forEach(function (item) {
                    let preceding = item.data.ed.insertAfter        //the path of the item that the item should be inserted after
                    let currentPos = findCurrentPositionInTree(item.data.ed.path)    //where the item to be moved is currently placed

                    for (let i=0; i< treeData.length; i++) {
                        let tItem = treeData[i]
                        if (tItem.data.ed.path == preceding) {
                            //this is the point to move the item to
                            console.log(i)
                            //first, remove the item from the tree
                            let itemToMove = treeData.splice(currentPos,1)       //OK, it's removed

                            if (currentPos < i) {
                                //if the item to be moved is above the insertion point, then slicing it out means we need to adjust the insertion point
                                i--
                            } else {
                                i++
                            }

                            //now insert it into the tree at 'i' - todo need to check if itemToMove is above or below insert point
                            treeData.splice(i,0,itemToMove[0])
                            break

                        }
                    }
                    console.log(treeData)

                })

                function findCurrentPositionInTree(path) {
                    //find where an item is in the tree based on the path
                    //have to do this each time as it may change with other moves
                    let pos = -1
                    for (const item of treeData) {
                        pos ++
                        if (item.data.ed.path == path) {
                            return pos
                        }
                    }
                }

            }
        }


    })