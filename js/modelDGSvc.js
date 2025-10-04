angular.module("pocApp")

    .service('modelDGSvc', function($http,$q,$localStorage,utilsSvc,$filter) {

        let config = {}
        let vsUrlPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/" //the url prefix


        return {


            copyDG : function (DG,vo) {
                //create a copy of a DG - updating the ids and any ews...
                let hash = {} // we need to record id updates in the ED for EW
                let newDG = angular.copy(DG)
                newDG.name = vo.name
                newDG.title = vo.title
                newDG.description = vo.description

                newDG.id = utilsSvc.getUUID()
                if (newDG.diff) {
                    //update all the ids
                    for (let ed of newDG.diff) {
                        let newId = utilsSvc.getUUID()
                        hash[ed.id] = newId
                        ed.id = newId
                    }

                    //now the EWs

                    for (let ed of newDG.diff) {
                        if (ed.enableWhen) {
                            for (let ew of ed.enableWhen) {
                                //replace the first segment in the path with the new dg name
                                let ar = ew.source.split('.')
                                ar[0] = newDG.name
                                ew.source = ar.join('.')
                                ew.sourceId = hash[ew.sourceId]     //update the id from the hash of changes
                            }
                        }
                    }

                }
                return newDG

            },


            updateDGId : function (dg) {
                //add id's to the dg and all the ed. Update any conditionals. Can run any number of times.

//return //just for now

              //  return
                dg.id = dg.id || utilsSvc.getUUID()

                let hashByPath = {}

                //assign the ids
                dg.diff.forEach(function (ed) {
                    let id = ed.id || utilsSvc.getUUID()
                    ed.id = id
                    let fullPath = `${dg.name}.${ed.path}`    //the diff doesn't have the dg name prefix
                    hashByPath[fullPath] = id
                })

                //update the conditionals that are directly defined in this DG
                dg.diff.forEach(function (ed) {
                    if (ed.enableWhen) {
                        ed.enableWhen.forEach(function (ew) {
                            //note that ew.source has the dgName as a prefix. hashByPath does not.

                            let key = ew.source


                            //let key = `${dg.name}.${ew.source}`

                            let sourceId = hashByPath[key]
                            if (sourceId) {
                                //ew.sourcePathId = sourceId
                                ew.sourceId = sourceId
                               // ew.issue =  ew.issue || []
                               // ew.issue.push(`Unable to locate the key ${key} in this DG. It may be inherited or contained.`)
                            } else {
                                console.error(`EW source path ${ew.source} not found in DG`)
                            }

                        })
                    }
                })

            },


            auditDGDiff : function (dg,hashAllDG) {
                //locate any 0..0 diff elements in the DG that do not correspond with parents. Occurs when parents are updated

                //first, go through the parental hierarchy and assemble a list of all elements in the hierarchy
                let hashAllParentalElements = {}
                let parentName = dg.parent  //the name of the parent

                while (parentName) {
                    let pDG = hashAllDG[parentName]
                    if (pDG) {
                        if (pDG.diff) {
                            pDG.diff.forEach(function (ed) {
                                if (ed.mult !== '0..0') {      //only concern ourselves with actual definitions atm
                                    hashAllParentalElements[ed.path] = {path:ed.path,defined:parentName,definedTitle:pDG.title, type:ed.type}
                                }
                            })
                        }
                        parentName = pDG.parent
                    } else {
                        alert(`The parent: ${parentName}  was not found`)
                        return {allElements: {},lstRedundantEd:[]}
                    }

                }

                //now go through the diff of the DG under check and see if any of the 0..0 elements there are not in the hierarchy
                let lstRedundant = []
                if (dg.diff) {
                    dg.diff.forEach(function (ed) {
                        let definition =  hashAllParentalElements[ed.path]  //is this element from a parent?

                        if (ed.mult == '0..0') {
                            //let definition =  hashAllParentalElements[ed.path]
                            if (definition) {
                                //Yes! this is zeroing out an element from the hierarchy
                                definition.mult = '0..0'
                            } else {
                                //this is zeroing out an element no longer in the hierarchy
                                lstRedundant.push(ed)
                            }
                        } else {
                            if (definition) {
                                definition.mult = ed.mult
                            } else {
                                //this ed is defined in the DG
                                //It's safe to add it to the hash at this point - even though it wasn't defined on a parent
                                hashAllParentalElements[ed.path] = {path:ed.path,defined:dg.name,definedTitle:dg.title, mult:ed.mult,type:ed.type}
                            }
                        }

                    })
                }

                //finally, create a sortedlist of the definitions (to make the display a little easier)
                let lst = []
                Object.keys(hashAllParentalElements).forEach(function (key) {
                    lst.push(hashAllParentalElements[key])
                })
                lst.sort(function (a,b) {
                    if (a.path > b.path) {
                        return 1
                    } else {
                        return -1
                    }

                })

                return {allElements: lst,lstRedundantEd:lstRedundant}

                //console.log(hashAllParentalElements)




            },
            getAllEW : function (lstElements,dgName) {
                //given the expanded element list - construct a list of all dependencies (enableWhen)
                let allDependencies = []

                //construct a hash of all elements in this DG
                let hashElements = {}
                let hashElementsById = {}       //ew now use id's as the lookup
                let hashByLast = {}              //hash by last in path

                lstElements.forEach(function (item) {
                    if (item.ed.mult !== '0..0') {
                        hashElements[item.ed.path] = item.ed
                        if (item.ed.id) {   //once updated, this should always be true
                            hashElementsById[item.ed.id] = item.ed
                            let last = $filter('lastInPath')(item.ed.path)
                            hashByLast[last] = hashByLast[last] || []
                            hashByLast[last].push(item.ed)
                        } else {
                            if (item.ed.path !==dgName) {   //the first element is the DG and won't have an id (or a path)
                               //just fills the log... console.error(`path ${item.ed.path} has no Id`)
                            }

                        }

                    }
                })

                //now create the ew list
                lstElements.forEach(function (item) {
                    if (item.ed && item.ed.enableWhen && item.ed.mult !== '0..0') {
                        //note that the ew here is not the same as in the Q - for example it has 'source' rather than 'question'
                        item.ed.enableWhen.forEach(function (ew) {

                            //adjusts the source (controller) path for contained DG's with conditionals
                            //also called when rendering a Q...
                            let source = ew.source      //corresponds to 'question' in the Q
                            let entry = {}
                            let sourceEd

                            let findStrategy = 'id'        //so I can test different strategies

                            if (findStrategy == 'id') {
                                if (ew.sourceId) {
                                    sourceEd = hashElementsById[ew.sourceId]

                                    if (! sourceEd) {

                                        entry.error = `Warning! source ed ${ew.sourceId} not found`
                                    }
                                } else {

                                    if (hashElements[ew.source]) {
                                        entry.error = `Warning! EW ${ew.source}  missing sourceId, but sourcePath is found`
                                    } else {
                                        //is there any element where the last segment in the source matches
                                        let sourceLast = $filter('lastInPath')(ew.source)
                                        if (hashByLast[sourceLast]) {



                                            entry.error = `Warning! EW ${ew.source}  missing sourceId, but ${hashByLast[sourceLast].length} elements found with last segment match`
                                        } else {
                                            entry.error = `Warning! EW ${ew.source}  missing sourceId`
                                        }




                                    }


                                }

                            }
                            if (findStrategy == 'path') {
                                    sourceEd = hashElements[source]
                                  if (! sourceEd) {
                                      //could be a contained
                                      let ar = source.split('.')
                                      //todo - if we make the path in the container the same as the DG name then we don't need to remove it and it will be more robust
                                      ar.splice(0,1)      //remove the first in the path - the dg where the ew is defined
                                      let matchingPath = ar.join('.')     //we're looking for an element whose path ends with this
                                      let matches = []        //matching elements - there should only be 1

                                      for (const key of Object.keys(hashElements)) {
                                          if (key.endsWith(matchingPath)) {
                                              matches.push(hashElements[key])
                                          }
                                      }

                                      if (matches.length == 1) {
                                          sourceEd = matches[0]
                                      } else {
                                          entry.error = `Warning! source ed not found at path ${ew.source}`
                                      }

                                  }
                            }

                            entry = {...entry, path:item.ed.path,ew:ew,ed:sourceEd}


                            allDependencies.push(entry)
                        })
                    }

                })


                return allDependencies

            },
            auditDGDEP : function (hashAllDG) {
                //compare the DG hash with $localStorage. There could be a bug where localStorage is not being updated
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    if (angular.toJson(dg) !== $localStorage.world.dataGroups[dg.name]) {
                        alert(`Warning! the Browser copy of the DG ${dg.name} doesn't match the copy in memory! You should re-load the page and check it. From modelDGSvc`)


                    }
                })
            },

            checkAllDGDEP : function (hashAllDG) {
                //check DG for invalid construction that can crash the browser
                let that = this
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]

                    if (that.hasDuplicatedParent(dg,hashAllDG)){
                        //oops - there's a loop!
                        delete dg.parent
                        alert(`The DG: ${key} has a duplicated parent in the inheritance chain. The parent has been removed.`)
                    }

                })


            },

            hasDuplicatedParent : function(dg,hashAllDG) {
                //is there a repeated parent in the inheritance chain (will crash the browser
                //console.log('===>',dg.name)
                let hashParent = {}
                let model =  angular.copy(dg)
                while (model) {
                    if (model.parent) {
                        if (hashParent[model.parent]) {
                            alert(`The DG ${model.parent} is already a parent in this chain. It cannot appear more than once`)
                            return false
                        } else {
                            hashParent[model.parent] = true
                            model = hashAllDG[model.parent]
                        }
                    } else {
                        model = null
                    }
                }


                return false

            },


            expandEdValues : function (ed) {
                let deferred = $q.defer()
                //return the list of possible options for en ed. There are 2 sources:
                //the 'options' array or the valueSet. The valueSet has precedence


                if (ed && ed.valueSet) {
                    //if there's a valueSet, then try to expand it
                    let url = ed.valueSet
                    //the valueSet might be the full VS or just the name
                    if (! ed.valueSet.startsWith("http")){
                        url = `${vsUrlPrefix}${ed.valueSet}`
                    }

                    let qry = `ValueSet/$expand?url=${url}&_summary=false`
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let expandedVS = data.data
                            let ar = []
                            for (const concept of expandedVS.expansion.contains) {
                                ar.push(concept)

                            }
                            deferred.resolve(ar)

                        }, function (err) {

                            console.error(`There was no ValueSet with the url:${ed.valueSet}`)
                            //deferred.resolve(ar)
                        }
                    )
                } else if (ed && ed.options) {
                    deferred.resolve(ed.options)
                }

                return deferred.promise
            },

            makeTreeViewOfCategories: function(hashCategories) {
                let treeData = []
                let root = {id:"root",text: "Categories",parent:'#',data:{}}
                treeData.push(root)

                Object.keys(hashCategories).forEach(function (key) {
                    let arCategory = hashCategories[key]

                    let node = {id:key,text: key,parent:'root',data:{}}
                    treeData.push(node)
                    arCategory.forEach(function (dg) {
                        let child = {id:dg.name,text: dg.title, parent:key,data:{dg:dg}}
                        treeData.push(child)
                    })

                })
                return {treeData:treeData}

            },

            analyseCategories: function(hashAllDG) {
                //create a hash by category of all DG
                let hashCategory = {}       //the return - keyed by categort code
                let hashDG = {}         //working - category for a DG keyed by DG name
                //first, add all the DG's that have the category directlt defined
                Object.keys(hashAllDG).forEach(function (key) {
                    let dg = hashAllDG[key]
                    let cTag = findCategoryTag(dg)
                    if (cTag.code) {
                        hashCategory[cTag.code] = hashCategory[cTag.code] || []

                        hashCategory[cTag.code].push(dg)
                        hashDG[dg.name] = cTag.code         //we'll use this when we check for inherited catgories
                    }
                })

                //now run through all DGs again looking for inherited categories
                Object.keys(hashAllDG).forEach(function (key) {
                    let clone = hashAllDG[key]
                    while (clone.parent && ! hashDG[clone.name]) {
                        if (hashDG[clone.parent]) {
                            //the parent has a category
                            let category = hashDG[clone.parent]         //the parents category
                            hashCategory[category].push(clone)
                            hashDG[clone.parent] = category
                        }
                        clone = angular.copy(hashAllDG[clone.parent]) || {} //to allow for where the parent has not been downloaded

                    }
                })

                //console.log(hashCategory,hashDG)
                return hashCategory



                function findCategoryTag(DG) {
                    let cTag = {}
                    if (DG && DG.tags) {
                        //console.log(DG.name,DG.tags)
                        DG.tags.forEach(function (tag) {
                            if (tag.system == "dgcategory") {
                                cTag = tag
                            }
                        })
                    }
                    return cTag
                }
            },


            makeTreeViewOfDG : function(hashAllDG) {
                if (! hashAllDG) {
                    //return an empty tree
                    let root = {id:"root",text: "DataGroups tree",parent:'#',data:{}}
                    let treeData = [(root)]
                    return {treeData:treeData}
                }


                //create a treeview ordered by parent
                //add the root
                let treeData = []
                let root = {id:"root",text: "DataGroups tree",parent:'#',data:{}}
                treeData.push(root)

                //set up the sections (headings) tree
                let sectionTreeData = []
                let sectionRoot = {id:"Section",text: "Sections tree",parent:'#',data:{}}
                sectionTreeData.push(sectionRoot)

                //todo get


                //make a list
                let ar = []
                Object.keys(hashAllDG).forEach(function (key) {

                    if (['root'].indexOf(key) > -1) {
                        alert(`There is a DG with the name: ${key} which is not allowed. Remove it from the current Model.`)
                        delete hashAllDG[key]
                    } else {
                        let dg = hashAllDG[key]
                        ar.push(dg)
                    }



                })

                //now sort by name for the full DG tree
                ar.sort(function (a,b) {
                    let aTitle = a.title || a.name
                    let bTitle = b.title || b.name
                    if (aTitle.toLowerCase() > bTitle.toLowerCase()) {
                        return 1
                    } else { return -1}
                })

                ar.forEach(function (dg) {
                    let text = dg.title || dg.name
                    let parent = dg.parent || "root"
                    let node = {id:dg.name,text:text,parent:parent,data:{dgName: dg.name,dg:dg}}
                    treeData.push(node)

                })


                return {treeData:treeData,sectionTreeData : sectionTreeData}

            },

            makeSectionsTree : function(hashAllDG) {
                //oMake a tree that contains only the sections branch - ie all DG where the ultimate parent is "Section"

                let branchName = "Section"        //we want all DG's whose ultimate paretn is this one
                let sectionTreeData = []
                let sectionRoot = {id:"Section",text: "Sections tree",parent:'#',data:{}}
                sectionTreeData.push(sectionRoot)


                //create an alphabetized ;lis of DG
                let lst = []
                Object.keys(hashAllDG).forEach(function (key) {
                    lst.push(hashAllDG[key])
                })

                lst.sort(function (a,b) {
                    if (a.title > b.title) {
                        return 1
                    } else {
                        return -1
                    }
                })

                try {
                    lst.forEach(function (dg) {
                        if (dg.name !== branchName) {

                            //findUltimateParent can throw an exception if the parental hierarchy is incorrect - let it bubble up and alert
                            let ultimateParent = findUltimateParent(dg)

                            if (ultimateParent.name == branchName) {

                                let sectionNode = {id:dg.name,
                                    text:dg.title,
                                    parent:dg.parent,
                                    data:{dgName:dg.name,dg:dg}}
                                sectionTreeData.push(sectionNode)
                            }
                        }

                    })
                } catch (ex) {
                    alert(ex)
                }


/*
                try {
                    Object.keys(hashAllDG).forEach(function (key) {
                        if (key !== branchName) {
                            let dgToFindUltimateParent = hashAllDG[key]
                            //console.log(key,dgToFindUltimateParent)
                            //findUltimateParent can throw an exception - let it bubble up
                            let ultimateParent = findUltimateParent(dgToFindUltimateParent)

                            if (ultimateParent.name == branchName) {

                                let sectionNode = {id:dgToFindUltimateParent.name,
                                    text:dgToFindUltimateParent.title,
                                    parent:dgToFindUltimateParent.parent,data:{dg:dgToFindUltimateParent}}
                                sectionTreeData.push(sectionNode)
                            }
                        }

                    })
                } catch (ex) {
                    alert(ex)
                }
*/

                return {treeData: sectionTreeData}

                function findUltimateParent(dg) {
                    let dgName = dg.name
                    let tmpDG = dg

                    let ctr = 0

                    while (tmpDG.parent) {
                        let parent = tmpDG.parent
                        let dgTitle = tmpDG.title
                        tmpDG = hashAllDG[tmpDG.parent]
                        if (! tmpDG) {
                            throw new Error(`DG ${parent} was not found. Referenced in ${dgTitle}`)
                            return
                        }

                        ctr++
                        if (ctr > 100) {
                            throw new Error(`Error finding ultimate parent of ${dgName}`)
                            return
                        }

                    }
                    return tmpDG
                }

            },


            makeGraphOneDG :  function(dg,allElements,in_hashAllDG) {
                //direct references only (for now)
                let fhirDT = utilsSvc.fhirDataTypes()
                let arNodes = []
                let arEdges = []

                let rootNode = {id: dg.name, label:dg.name ,shape: 'box'}
                arNodes.push(rootNode)

                allElements.forEach(function (item,ctr) {
                    let ed = item.ed
                    if (ed && ed.type) {
                        let type = ed.type[0]
                        if (fhirDT.indexOf(type) == -1) {

                            let id = `${type}-${ctr}`
                            let node = {id: id, label:type,shape: 'box'}

                            node.data = {model: in_hashAllDG[type]}
                            arNodes.push(node)

                            let label = $filter('lastInPath')(ed.path)

                            let edge = {id: 'e' + arEdges.length +1,
                                from: rootNode.id,
                                to: id,
                                color: 'black',
                                //width: 4,
                                //label: 'references',arrows : {to:true}},
                                label:label,arrows : {to:true}}
                            arEdges.push(edge)

                            }



                    }


                })

                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };

                return {graphData:graphData}

            },


            makeFullGraph : function(in_hashAllDG,hideReferences,hideParents) {

                //create a single graph with all DGs. hashierarchy and optionally references
                //shows on the main page

                let hashIdNodesCreated = {}

                let hashAllDG = angular.copy(in_hashAllDG)
                let arNodes = []
                let arEdges = []

                //create the root node. This is the default parent (unless a DG already has one
                let rootNode = {id:"root", label: "root",shape: 'box',color:'white'}
                rootNode.data = {dg:{}}

                Object.keys(hashAllDG).forEach(function (key) {

                    let DG = angular.copy(hashAllDG[key])

                    //create the node
                    //If there are multiple nodes with the same id, vis will crash
                    if (! hashIdNodesCreated[DG.name]) {
                        hashIdNodesCreated[DG.name] = true
                        let node = {id: DG.name, label: DG.name,shape: 'box'}
                        node.data = {dg:DG}
                        arNodes.push(node)
                    } else {
                        console.error(`Duplicate DG name: ${DG.name}`)
                    }



                    //add the default parent if needed
                    //Dec16 - why did I do this?
                    if (! DG.parent) {
                     //   DG.parent = "root"
                    }

                    //check for parent
                    if (DG.parent && ! hideParents) {
                        //create the 'parent' link  todo - graph needs to add parent
                        let edge = {id: 'e' + arEdges.length +1,
                            from: DG.name,
                            //to: model.parent,
                            to: DG.parent,
                            color: 'red',
                            //width: 4,
                            label: 'specializes',arrows : {to:true}}
                        arEdges.push(edge)
                        //console.log(edge)
                    } else {
                        //there is
                    }

                    DG.diff.forEach(function (ed) {
                        let type = ed.type[0]           //assume one type only

                        //let leafPath = $filter('lastInPath')(ed.path)

                        if (! hideReferences) {
                            if (hashAllDG[type] && hashAllDG[type].diff) {
                                //this is a DG (rather than a FHIR DT) as it has a diff
                                //create a reference edge
                                let edge = {id: 'e' + arEdges.length +1,
                                    from: DG.name,
                                    //to: model.parent,
                                    to: hashAllDG[type].name,
                                    //color: 'red',
                                    //width: 4,
                                    label: ed.path,arrows : {to:true}}
                                arEdges.push(edge)
                            }
                        }
                    })
                })


                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };

                return {graphData:graphData}

            },

            updateChangesDEP : function (DG,change,scope) {
                DG.changes = DG.changes || []
                DG.changes.push(change)
               // console.log('emitting')
                scope.$emit("dgUpdated",{})

            },



            makeUpdateListDEP: function (allDG,xref) {
                //create a list of all DG updates
                //let report = {newDG:[],newElement:[],changedElement:[]}
                let report = []

              //  console.log(xref)

                Object.keys(allDG).forEach(function (key) {
                    let dg = allDG[key]
                    if (dg.status == 'new') {
                        let item = {DGName:dg.name,msg:"New DataGroup",xref:xref[dg.name]}
                        report.push(item)

                    } else {
                        if (dg.changes) {
                            dg.changes.forEach(function (change) {
                                //{edPath: msg: }
                                let item = {DGName:dg.name,msg:change.msg,path:change.edPath,xref:xref[dg.name]}
                                report.push(item)
                            })
                        }

                    }
                })

                return report

            }
        }
    })