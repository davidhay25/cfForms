angular.module("pocApp")

    .service('modelsSvc', function($q,$filter,$http,makeQSvc,$timeout,snapshotSvc) {
        let cache = {}

        this.fhir = {}
        this.user

        return {


            sortDiff: function (diff) {

                let lst = []
                let hash = {}
                diff.forEach(function (ed) {
                    lst.push(ed.path)
                    hash[ed.path] = ed
                })
                //console.log(angular.toJson(lst))

                let lst1 = sortHierarchicallyWithFirstAppearance(lst)

                diff = []
                lst1.forEach(function (path) {
                    diff.push(hash[path])
                })
                //console.log(lst1)
                //console.log(angular.toJson(lst1))


            //this routine is from chatGPT...
            function sortHierarchicallyWithFirstAppearance(list) {
            // Step 1: Track first appearance of each path
                const firstAppearance = {};
                list.forEach((item, index) => {
                    firstAppearance[item] = firstAppearance[item] ?? index;
                });

                // Step 2: Build a tree structure
                const tree = {};
                list.forEach(path => {
                    const parts = path.split('.');
                    let node = tree;
                    for (let i = 0; i < parts.length; i++) {
                        const subPath = parts.slice(0, i + 1).join('.');
                        node[subPath] = node[subPath] || {children: {}, order: firstAppearance[subPath]};
                        node = node[subPath].children;
                    }
                });

            // Step 3: Recursively extract sorted elements
            function extractSortedPaths(node) {
                return Object.entries(node)
                    .sort((a, b) => a[1].order - b[1].order) // Sort by first appearance
                    .flatMap(([key, value]) => [key, ...extractSortedPaths(value.children)]);
            }

            return extractSortedPaths(tree);
        }


    },




        makeCompTreeDEP : function (arElements) {
                //generate a simplified tree view for the review...
                let treeData = []
                //let compElements = []


                let rootEd = arElements[0].ed
                rootEd.kind = 'root'

                let rootNode = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(rootNode)


                //first create a simplified list by reducing the degree of nesting
                //let rootNode = {}
                let arParent = []      //track the element that is a parent at a given level
                let sectionNode     //the section node with DG elements directly attached
                arElements.forEach(function (item) {
                    let ed = item.ed
                    let arSegments = ed.path.split('.')
                    let cnt = arSegments.length //

                    switch (cnt) {
                        case 1:
                            //the composition name
                            break
                        case 2:
                            //a new section
                            sectionNode = {id:ed.path,parent:rootNode.id,text:ed.title,data:{ed:ed}}
                            treeData.push(sectionNode)
                            //arParent[cnt] = ed.path //save the id at this level for children
                            break
                        case 3:
                            //the section dg
                            //arParent[cnt] = ed.path //save the id at this level for children

                            //sectionDGNode = {id:ed.path,parent:rootNode.id,text:ed.title,data:{ed:ed}}
                           // treeData.push(sectionDGNode)


                           // arParent[cnt] = ed.path //save the id at this level for children
                            break
                        case 4:
                            //a child DG off the section. We do need to kep this for SectionDGs with multiple child DGs...
                            //the title in the composiiton is often significant...
                            let itemNode = {id:ed.path,parent:sectionNode.id,text:ed.title,data:{ed:ed}}
                            treeData.push(itemNode)
                            arParent[cnt] = ed.path //save the id at this level for children
                            console.log(cnt,ed.path)
                            break
                        default:
                            //an element within the DG
                            //we do want to preserve the indentation within the DG

                            console.log(cnt,ed.path)

                            arParent[cnt] = ed.path //save the id at this level for children
                            //the parent will be the element with 1 less segment...
                            let parentId = arParent[cnt-1]
                            console.log(parentId)
                            if (parentId) {
                                let itemNode = {id:ed.path,parent:parentId,text:ed.title,data:{ed:ed}}
                                treeData.push(itemNode)
                            } else {
                                console.log('adding to section')
                                //if null then add to the section
                                let itemNode = {id:ed.path,parent:sectionNode.id,text:ed.title,data:{ed:ed}}
                                treeData.push(itemNode)
                            }



                            break



                    }

                })


                return treeData

/*

                let rootEd = compElements[0].ed
                rootEd.kind = 'root'

                let root = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(root)

                for (let i=1; i < compElements.length; i++) {          //skip the root
                    let ed = compElements[i].ed
                    let host = compElements[i].host         //will only be present in a composition section
                    //console.log(ed.path)
                    let ar = ed.path.split('.')
                    let leafPath = ar.pop()     // the name is the last item.
                    let parent = ar.join(".")  //the
                    let id = ed.path

                    //create the tree text
                    let text
                    if (host && host.title) {
                        text = host.title
                    }

                    text = text || ed.title || leafPath


                    let node = {id: id, text: text, parent: parent, data: {ed: ed, host: host}}

                    treeData.push(node)
                }
                return treeData
                */

            },








            setUser : function (user) {
                this.user = user
            },
            getuser : function () {
                return this.user
            },
            isUniqueNameOnLibrary : function (name, modelType) {
                let deferred = $q.defer()
                //check that the name is unique for the modelType (comp, dt) Case sensitive.
                //just check the library


                let url = `/model/DG/${name}`
                if (modelType == 'comp') {
                    url = `/model/comp/${name}`
                }

                $http.get(url).then(
                    function (data) {
                        //if something it returned, then this is not a unique name
                        deferred.reject(data.data)  //reject it, returning the one that was found
                    },
                    function (err) {
                        if (err.status == 404) {
                            deferred.resolve()      //a 404, all good
                        } else {
                            alert(angular.toJson(err))
                            deferred.reject()       //something else? reject
                        }

                    }
                )

                return deferred.promise

            },
            getSizeOfObject : function( object ) {
                //the memory usage of an obect - from https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object#11900218
                var objectList = [];
                var stack = [ object ];
                var bytes = 0;

                while ( stack.length ) {
                    var value = stack.pop();

                    if ( typeof value === 'boolean' ) {
                        bytes += 4;
                    }
                    else if ( typeof value === 'string' ) {
                        bytes += value.length * 2;
                    }
                    else if ( typeof value === 'number' ) {
                        bytes += 8;
                    }
                    else if (
                        typeof value === 'object'
                        && objectList.indexOf( value ) === -1
                    ) {
                        objectList.push( value );

                        for( var i in value ) {
                            stack.push( value[ i ] );
                        }
                    }
                }
                return bytes;
            },
            getReferencedModels : function (hashDG,hashComp) {
                //create a hash showing references between models

                //hashReferences is keyed by A DG. It contains a list of all other DG's that reference it - including parental
                let hashReferences = {}

                //DG's
                Object.keys(hashDG).forEach(function (key) {
                    let DG = hashDG[key]

                    let model = angular.copy(DG) //we're going to chane model so need a copy..

                    let currentModelParent = model.parent

                    //record all the parents of this DG, traversing up the hierarchy
                    while (model && model.parent) {
                       // console.log(`Examining ${DG.name}: ${model.parent} is the parent of ${model.name}`)
                        model = hashDG[model.parent]

                        if (model) {
                            hashReferences[model.name] = hashReferences[model.name] || []
                            hashReferences[model.name].push({name:DG.name,title:DG.title,kind:model.kind,mode:'parent'})
                            currentModelParent = model.parent
                        } else {
                            console.log(`The DG ${key} has a parent or grandParent of ${currentModelParent} which is not a DG`)
                            //console.log(`The DG ${key} has a parent of ${model.parent} which is not a DG`)
                        }

                    }

                    if (DG.diff) {
                        DG.diff.forEach(function (ed) {
                            if (ed.type) {
                                ed.type.forEach(function (typ) {
                                   // console.log(typ)
                                    hashReferences[typ] = hashReferences[typ] || []
                                    hashReferences[typ].push({name:DG.name,kind:DG.kind,path:ed.path,mode:'uses',mult:ed.mult,title:DG.title})
                                })
                            }
                        })
                    }
                })

                //DGs referenced by Compositions
                Object.keys(hashComp).forEach(function (key) {
                    let comp = hashComp[key]
                    if (comp.sections) {
                        comp.sections.forEach(function (section) {
                            if (section.items) {
                                section.items.forEach(function (item) {
                                    if (item.type) {
                                        item.type.forEach(function (typ) {
                                            hashReferences[typ] = hashReferences[typ] || []
                                            hashReferences[typ].push({name:comp.name,kind:comp.kind,path:item.name,mult:item.mult,title:comp.title})
                                        })
                                    }

                                })
                            }

                        })
                    }
                })

                //sort contents of each
                Object.keys(hashReferences).forEach(function (key) {
                    let ar = hashReferences[key]
                    ar.sort(function (a,b) {
                        if (a.title > b.title) {
                            return 1
                        } else {
                            return  -1
                        }

                    })

                })

                return hashReferences

            },
            updateOrAddElement : function(model,element) {
                //if there's already an overide in the model, then update it.
                //note sepecific elements only, ie: valueSet
                let relativePath =  $filter('dropFirstInPath')(element.path);
                let found = false
                model.diff.forEach(function(ed) {
                    if (ed.path == relativePath)  {
                        ed.valueSet = element.valueSet
                        ed.mult = element.mult
                        found = true
                    }
                })
                //if not, then add it
                if (! found) {
                    let newElement = angular.copy(element)
                    newElement.path = relativePath
                    model.diff.push(newElement)
                }
            },
            summarizeValidation : function(OO,bundle) {
                //todo - do we need this???
                //present the validation issues in the OO with the bundle entry
                //copied from commonSvc, removing the Q specific stuff

                //let cloneBundle = angular.copy()    //we're going to add issues directly to the resource...

                //create an index of resources in the bundle
                let totalErrors = 0
                let lstResources = []
                let unknownIssues = []      //issues that can't be associated with a specific resource
                let enhancedErrors = []     //errors with improved notification

                //let hashResources = {}


                if (bundle && bundle.entry) {
                    bundle.entry.forEach(function (entry,inx) {
                        lstResources.push({resource:entry.resource,pos:inx,issues:[]})
                    })
                }


                //add all the issues in the OO to the list
                if (OO && OO.issue) {
                    OO.issue.forEach(function (iss) {
                        if (iss.location) {
                            let loc = iss.location[0]
                            let ar = loc.split('[')
                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)
                                //console.log(pos,loc)

                                let item = {severity:iss.severity,location:loc,pos:pos,diagnostics:iss.diagnostics}

                                if (iss.severity == 'error') {
                                    totalErrors++
                                }

                                let resourceAtIndex = lstResources[pos]
                                if (resourceAtIndex) {
                                    resourceAtIndex.issues.push(item)
                                }



                            } else {
                                unknownIssues.push(iss)
                            }


                        } else {
                            //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                            unknownIssues.push(iss)
                        }

                    })
                }


                return {resources:lstResources,totalErrors:totalErrors,unknownIssues:unknownIssues,enhancedErrors:enhancedErrors}



            },
            fhirDataTypes : function(){
                //theres also a list in snapShot Svc and utilsSvc todo: rationalize
                return ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']
            },

            getAllTypes : function (hashAllDG) {
                //return a list of all types
                let types = angular.copy(hashAllDG)
                for (const dt of this.fhirDataTypes()) {
                    types[dt] = true
                }
                return types
            },
            makeTreeFromElementList : function(arElements){
                //construct a DG and composition tree assuming that arElements is in path order
                let that = this
                let rootEd = arElements[0].ed
                rootEd.kind = 'root'
                let treeData = []

                let treeIcons = {}
                treeIcons.section = "icon-qi-horizontal.png"
                treeIcons.dg = "icon-q-group.png"
                treeIcons.slice = "icon-q-group.png"


                //add the root
                let root = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(root)

                for (let i=1; i < arElements.length; i++){          //skip the root
                    let ed = arElements[i].ed
                    let host = arElements[i].host         //will only be present in a composition section
                    //console.log(ed.path)
                    let ar = ed.path.split('.')
                    let leafPath = ar.pop()     // the name is the last item.
                    let parent = ar.join(".")  //the
                    let id = ed.path

                    //create the tree text
                    let text
                    if (host && host.title) {
                        text = host.title
                    }

                    text = text || ed.title || leafPath
                    let node = {id:id,text:text,parent:parent,data:{ed:ed,host:host}}

                    node.data.level = ed.kind       //Questionnaire uses 'level'

                    let voControl = makeQSvc.getControlDetails(ed)

                    node.data.ed.controlType = voControl.controlType
                    node.data.ed.controlHint = voControl.controlHint
                    node.icon = `icons/icon_primitive.png`  //the default icon

                    let arStyle = []         //the style element to add to the node['a_attr']

                    if (ed.kind) {
                        if (treeIcons[ed.kind]) {
                            node.icon = `icons/${treeIcons[ed.kind]}`
                        }
                    }

                    if (ed.type && ed.type[0] == 'CodeableConcept') {
                        node.icon = "icons/icon_datatype.gif"
                    }

                    //fixed values are blue
                    if (ed.fixedCoding || ed.fixedString) {
                        arStyle.push("color : blue")
                       // node['a_attr'] = { "style": "color : blue" }
                    }

                    //this element was defined on a parent. This will superceed the fixed value
                    if (ed.sourceModelName && (ed.sourceModelName !== rootEd.path) && (! ed.definedOnDG)) {
                        arStyle.push("color : #999999")
                    }


                    //required

                    if (ed.mult) {
                        //required bolding
                        if (ed.mult.indexOf('1..') > -1) {
                            //need to add to any existing stype

                            arStyle.push("font-weight:bold")
                           // node['a_attr'] = { "style": "font-weight:bold" }
                        }
                        //multiple
                        if (ed.mult.indexOf('..*') > -1) {
                            node.text += " *"
                        }
                    }

                    if (ed.hideInQ || ed.hiddenInQ) {
                        arStyle.push("text-decoration: line-through")
                    } else {
                        //if there is hideInQ then it has precedence over showing enablewhen

                        if (ed.enableWhen?.length > 0) {
                            arStyle.push("text-decoration-line: underline")
                            arStyle.push("text-decoration-style: dotted")
                        }

                        if (ed.conditionalVS?.length > 0) {
                            arStyle.push("text-decoration-line: underline")
                            arStyle.push("text-decoration-style: dotted")
                        }

                    }



                    //construct the style element for the 'a'
                    if (arStyle.length > 0) {
                        let style = ""
                        arStyle.forEach(function (s) {
                            style += s + ";"

                        })
                        node['a_attr'] = { "style": style}
                       // console.log(ed.path,style)
                    }



                    if (ed.mult && ed.mult == '0..0') {
                        //don't add removed elements
                    } else {
                        treeData.push(node)
                    }

                }

                //orderingSvc.sortDGTree(treeData)    //adjust the order in the tree
                //console.log(treeData)

                return treeData


            },

            makeOrderedFullList : function (elements) {
                //this routine will crash under some circumstances - specifically if there
                //is a missing element that has 'children' below it. I don't know why this is happenning.
                //The safest is to delete this DG and re-enter it. If the same error persists, then that might help figure out what is going on.
                let errors = []

                if (! elements || elements.length == 0) {
                    return []
                }
                //generate a list of elements for a given DG (based on the allElements array) that follows the slicing order
                //elements is the complete list of elements, including those derived from parents referenced eds
                //   (from modelsSvc.getFullListOfElements)

                //first construct an object that represents the hierarchy (rather than a flat list of elements).
                let dgName = elements[0].ed.path
                let hash = {}
                let rootPath

                elements.forEach(function (item,inx) {
                    let ed = item.ed
                    let path = ed.path
                    if (! hash[path]) {
                        //add to the hash in case it is a parent. but check first in case the list is out of order..
                        hash[path] = {ed:ed,children:[]}
                    } else {
                        //If it is already there, then it got added to set the children, so add the ed
                        hash[path].ed = ed
                    }


                    //add the ed to the parent
                    let ar = ed.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        //note that 'parent' is not the DG parent but the previous path segment
                        let parentPath = ar.join('.')
                        if (!hash[parentPath]) {

                            //2024-11-19 - this can occur when the elements array is out of order.
                            //I think we can just add it, with the child added. The ed will be added at the top of this loop
                            hash[parentPath] = {children:[]}
                            hash[parentPath].children.push(hash[path])

                            //2024-11-19 - errors.push(parentPath)
                            //2024-11-19 - alert(`The paths in DG ${dgName} have become corrupted. The path ${parentPath} could not be found. You'll need to remove the element with the path ${ed.path } from the diff tab.`)

                           // alert(`The DG ${}`)
                            //there's been an issue - an element has been dropped. not sure why...
                            //for now, add it into the hash  todo - need a more definitive solution later
                            //temp let dummyEd = {path:parentPath,title:"Inserted element",description:"Issue here",type:['Group'],mult:'0..1'}
                           // temp hash[parentPath] = {ed : dummyEd,children:[]}
                           // temp hash[parentPath].children.push(hash[path])

                        } else {
                            hash[parentPath].children.push(hash[path])
                        }
                    } else {
                        //this is the top node

                        rootPath = ar[0]
                    }
                })

                if (errors.length > 0) {
                   // alert("There were missing elements in the DG. The safest course is to abandon this DG and re-create it. You could try reverting and checking out to see if there is a good copy in the library.")
                }

                // now we can build the ordered list


                let arLines = []

                //the recursive processing function
                function processNode(ar,node,spacer) {
                    //sep 8 - there was a 'children' element - don't think we want that
                    let clone = angular.copy(node)
                    delete clone.children
                    //console.log(clone)
                    ar.push(clone)
                    //ar.push(node)

                    if (node.children) {
                        node.children.forEach(function (child) {
                            processNode(ar,child,spacer)
                        })
                    }
                }

                processNode(arLines,hash[rootPath],"")

                //There's a particular issue in that slicing changes the datatype for the 'parent' element to Group
                //but parents of that element may still persist (they get added as the parents are processed first)
                //so create a list of all elements with a type of Group. Then, from the originalType we can create
                // a list of elements that came directly from the type and remove them (or set mult = 0..0)
                //only do this if the element was sliced (originalType present).

                let arHiddenElements = []  //an array of elements whose children should be hidden unless they are slices

                arLines.forEach(function (item) {
                    if (item.ed && item.ed.type) {
                        let type = item.ed.type[0]
                        if (type == 'Group' && item.ed.originalType) {  //presence of originalType indicates this element was sliced
                            //console.log("Group!",item.ed)
                            arHiddenElements.push(item.ed.path)
                            //if there are any elements that
                        } else{
                            arHiddenElements.forEach(function (prefix) {
                                let pathToTest = item.ed.path
                                //if (pathToTest.startsWith(prefix) && pathToTest.indexOf('slice:') == -1) {
                                if (pathToTest.isChildPath(prefix) && pathToTest.indexOf('slice:') == -1) {
                                    item.ed.mult = "0..0"
                                }
                            })
                        }
                    }

                })



                return arLines



            },

            fixDgDiffDEP : function (dg,fullList) {
                //remove any elements from the dg.diff where there is a missing 'parent path'

                let errors = []
                let hash = {}
                fullList.forEach(function (item,inx) {
                    let ed = item.ed
                    let path = ed.path
                    hash[path] = {ed:ed,children:[]}  //add to the hash in case it is a parent...

                    //add the ed to the parent
                    let ar = ed.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        //note that 'parent' is not the DG parent but the previous path segment
                        let parentPath = ar.join('.')
                        if (!hash[parentPath]) {

                            errors.push($filter('dropFirstInPath')(parentPath))
                            //alert(`The paths in DG ${dgName} have become corrupted. The path ${parentPath} could not be found. You'll need to remove the element with the path ${ed.path } from the diff tab.`)

                            //there's been an issue - an element has been dropped. not sure why...
                            //for now, add it into the hash  todo - need a more definitive solution later
                            let dummyEd = {path:parentPath,title:"Inserted element",description:"Issue here",type:['Group'],mult:'0..1'}
                            hash[parentPath] = {ed : dummyEd,children:[]}
                            hash[parentPath].children.push(hash[path])

                        } else {
                            hash[parentPath].children.push(hash[path])
                        }
                    }
                })

                if (errors.length > 0) {
                    if (confirm(`There were ${errors.length} missing paths. Shall I fix this by removing all child elements`)) {
                        let lst = []
                        dg.diff.forEach(function (diff) {
                            let path = diff.path
                            let ok = true
                            errors.forEach(function (missing) {
                                if (path.startsWith(missing)) {
                                    ok = false
                                }

                            })
                            if (ok) {
                                lst.push(diff)
                            } else {
                                console.log(`Will remove ${path}`)
                            }

                        })

                        dg.diff = lst
                        return true
                        /*
                        //a timeout to allow the dg change to
                        $timeout(function () {

                        },100)
                        */
                    }

                } else {
                    //alert("No issues found")
                    return false
                }

            },



            //todo - find and remove all references
            getFullListOfElements(inModel,inTypes,hashAllDG) {
                //console.log('getFullListOfElements for '+ inModel.name)
                if (! inModel) {
                    return {}
                }

                return  {allElements: snapshotSvc.getFullListOfElements(inModel.name)}

                let iterationCount = 0      //a counter to detect excessive iterations (indicates a circular reference)
                // console.log(`Processing ${inModel.name}`)
                //create a complete list of elements for a DG (Compositions have a separate function)

                //processing the DG hierarchy is destructive (the parent element is removed after processing
                //to avoid infinite recursion - update: not any more.
                let types = angular.copy(inTypes)
                //ensure the types hash has the FHIR dts as well
                let fdt = this.fhirDataTypes()
                fdt.forEach(function (dt) {
                    types[dt] = dt
                })


                let hashHidden = {}     //ed's with mult = 0..0

                let relationshipsSummary = {parents:[],references:[],children:[]}       //all the relationships for this DG (reference 1 level only)

                let model = angular.copy(inModel)
                let topModel = angular.copy(model)
                let allElements = []
                let errors = []
                let arLog = []  //a processing log of

                let hashEdges = {}      //a has to track edges between nodes to adoid duplication

                let arNodes = []      //for the graph
                let arEdges = []      //for the graph

                //first follow the parental hierarchy to populate the initial list
                //updates allElements as it extracts
                //as it moves up the hierarchy, add the element to the list (based on the path) unless there is
                //already one there (so it replaced the parental one)

                //create as ed to act as the root
                let edRoot = {ed:{path:model.name,title:model.title,description:model.description}}
                allElements.push(edRoot)

                //a hash of all parents examined as the DG is inflated.
                //If a DG is processed more than once, the process terminates with an error - this could be recursive
                let hashParents = {}

                try {
                    //udpates allElements
                    extractElements(model,model.name,'root')   //the guts of the function

                    arLog.length = 0        //don't return the log contents if all was OK
                } catch (ex) {
                    //thrown when the number of iterations is excessive (>300 ATM).
                    //usually a circular reference
                    console.log(arLog)

                    //alert(`Unable to inflate DG: ${model.name}. Error: ${angular.toJson(ex)}` )
                    //return {allElements: allElements,graphData:{},relationshipsSummary:relationshipsSummary}

                    //return {allElements: [],graphData:{},relationshipsSummary:relationshipsSummary}

                }


                //set the mult to 0..0 for any element where an ancestor (ie path in a parent) is 0..0
                //this doesn't change the ED stored in the browser - it's only the memory copy
                allElements.forEach(function (item) {
                    //item.ed.mult = '0..0'
                    for (const key of Object.keys(hashHidden)) {
                        //if (item.ed.path.startsWith(key +'.')) {
                        if (item.ed.path.isChildPath(key)) {
                            item.ed.mult = '0..0'
                            break
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

                //now populate the children array - ie models that have this dg as a parent
                Object.keys(hashAllDG).forEach(function (key) {
                    if (hashAllDG[key].parent == inModel.name) {
                        relationshipsSummary.children.push(key)
                    }
                })



                return {allElements: allElements,graphData:graphData,relationshipsSummary:relationshipsSummary,log:arLog,hashHidden:hashHidden}

                // add to list of elements, replacing any with the same path (as it has been overwritten)
                //todo - what was 'host' for?
                function addToList(ed,host,sourceModel) {
                    //is there already an entry with this path
                    let path = ed.path

                    let pos = -1
                    let found = false
                    for (const element of  allElements){
                        pos ++
                        // if (element.path == path) {   //changed Jul-29
                        if (element.ed.path == path) {     //should only be one (unless there are duplicate names in the model
                            found = true
                            break
                        }
                    }

                    /* April 3 - more efficitnt iterator
                    allElements.forEach(function (element,inx) {
                        // if (element.path == path) {   //changed Jul-29
                        if (element.ed.path == path) {     //should only be one (unless there are duplicate names in the model
                            pos = inx
                        }
                    })
                    */

                    let itemToInsert = {ed:ed,host}
                    if (host) {     //todo not sure if this is still used...
                        itemToInsert.host = host
                    }

                    //record the sourceModel - ie where in the hierarchy this element came from
                    if (sourceModel) {
                        itemToInsert.ed.sourceModelName = sourceModel.name
                    }

                    //jan16
                    if (ed.mult == '0..0') {
                        //this one is hidden. Add it to the hash
                        hashHidden[ed.path] = true
                    }

                    /*
                                        //added Jan16 - set mult 0..0 if parent is hidden
                                        if (ed.mult == '0..0') {
                                            //this one is hidden. Add it to the hash
                                            hashHidden[ed.path] = true
                                        } else {
                                            //are any of the ancestors hidden?
                                            for (const key of Object.keys(hashHidden)) {
                                                if (ed.path.startsWith(key)) {
                                                    ed.mult = '0..0'
                                                    break
                                                }
                                            }
                                        }
                    */


                    if (found) {
                        //if (pos > -1) {
                        //replace the existing path
                        //console.log('replacing ' + path + " (" + sourceModel.name + ")")

                        //if the item comes from the current model then it always overrides any other elements...
                        if (itemToInsert.ed.sourceModelName == inModel.name) {
                            allElements.splice(pos,1,itemToInsert)
                        }

                        //If it's already there, don't replace it as new elements are processed first...
                        //april 8 allElements.splice(pos,1,itemToInsert)
                    } else {
                        //console.log('inserting ' + path + " (" + sourceModel.name + ")")
                        allElements.push(itemToInsert)          //this is what was working - just at the end
                    }
                }

                //add graph node to the node list, replacing any with the same id
                function addNodeToList(node) {
                    let pos = -1

                    arNodes.forEach(function (iNode,inx) {
                        if (iNode.id == node.id) {
                            pos = inx
                        }
                    })

                    if (pos > -1) {
                        //there is already an element with this id - replace it
                        arNodes.splice(pos,1,node)
                    } else {
                        arNodes.push(node);
                    }
                }

                //process a single element at the root of the DG
                function extractElements(model,pathRoot,type) {
                    arLog.push({dg: model.name,path:pathRoot,type:type})
                    if (model.name == inModel.name) {
                        //alert(`Processing ${model.name}, path: ${pathRoot} and it has a reference to ${inModel.name} which is a circular reference! This should be fixed.`)
                        //return
                    }

                    iterationCount++
                    if (iterationCount > 2000) {
                        alert(`Excessive iteration count for DG ${inModel.name}. The tree view will be incorrect. The processing steps are shown in an errors tab.`)
                        throw new Error(`Excessive iteration count for DG ${inModel.name}`)
                    }

                    //add to nodes list

                    let node = {id: model.name, label: model.name,shape: 'box'}
                    node.data = {model:model}
                    if (model.name == topModel.name) {
                        node.color = '#ff8080'
                    } else if (model.kind == "comp") {
                        node.color = '#FFFFCC'
                    }

                    addNodeToList(node)

                    //console.log('extractElements ' + model.name)
                    //do parents first.
                    if (model.parent ) {

                        //console.log(model.name, model.parent)



                        if (types[model.parent]) {
                            //this is called whenever there is a DG to be expanded
                            if (pathRoot.split('.').length == 1) {
                                //if there is no '.' then this must be a DG parent
                                relationshipsSummary.parents.splice(0,0,model.parent)         //the name of the parent
                            } else {
                                //this must be a DG referenced by an element within the DG (or one of its ancestors)
                                relationshipsSummary.references.push({path:pathRoot,type:model.name})
                            }

                            //to prevent infinite recursion
                            let parentName = model.parent

                            // temp! delete model.parent

                            //create the 'parent' link  todo - graph needs to add parent
                            let edge = {id: 'e' + arEdges.length +1,
                                from: model.name,
                                //to: model.parent,
                                to: parentName,
                                color: 'red',
                                width: 4,
                                label: 'specializes',arrows : {to:true}}
                            arEdges.push(edge)

                            extractElements(types[parentName],pathRoot,"parent")


                        } else {
                            errors.push(`missing type name ${model.parent}`)
                            console.log(`missing type name ${model.parent}`)
                        }
                    }

                    if (model.diff) {
                        model.diff.forEach(function (ed) {

                            if (ed.type && ed.type.length > 0) {
                                let type = ed.type[0]   //only look at the first code
                                if (types[type]) {
                                    //this is a known type. Is there a definition for this type (ie do we need to expand it)
                                    //a fhir datatype will not have a diff...
                                    let childDefinition = types[type]

                                    if (childDefinition.diff ) {
                                        //if there is a diff element in the type, then it is a DG that can be expanded

                                        let relativePath =  $filter('dropFirstInPath')(`${pathRoot}.${ed.path}`)

                                        relationshipsSummary.references.push({path:relativePath,type:childDefinition.name})

                                        //avoid duplicates. eg where one DG refers to Observation multiple times, each results in Observation -> HCP
                                        let refHash = `${model.name}-${childDefinition.name}-${ed.path}`
                                        //only add an edge for a given source / target / path once
                                        if (! hashEdges[refHash]) {
                                            hashEdges[refHash] = true
                                            //create an edge. todo This is to ALL elements, so may want to filter
                                            let label = `${ed.path} ${ed.mult}`
                                            let edge = {id: 'e' + arEdges.length +1,
                                                from: model.name,
                                                to: childDefinition.name,
                                                color : 'blue',
                                                dashes : true,
                                                label: label,
                                                arrows : {to:true}}
                                            arEdges.push(edge)
                                        }


                                        //console.log('expanding child: ' + childDefinition.name)
                                        let clone = angular.copy(ed)
                                        clone.path = pathRoot + "." + ed.path

                                        //add to the list of elements
                                        addToList(clone,ed,model) //model will be the source

                                        extractElements(childDefinition,pathRoot + "." + ed.path,"element")

                                    } else {
                                        //list add the ed to the list
                                        //this is a fhir dt
                                        let clone = angular.copy(ed,null,model) //include the model so the source of the ed is known

                                        clone.path = pathRoot + '.' + ed.path
                                        // function addToList(ed,host,sourceModel) {
                                        addToList(clone,null,model)

                                    }


                                } else {
                                    errors.push(`missing type ${model.name}`)
                                    alert(`The type ${type} could not be found looking at DG ${model.name}`)
                                }


                            } else {
                                alert(`ed ${model.name} ${ed.path} is missing the type `)
                                errors.push(`ed ${model.name} ${ed.path} is missing the type `)
                            }
                        })
                    }



                }



            },

            validateModel : function (vo) {

                //create a combined hash, all names must be unique in the model. assume hash on name
                let hash = {}
                let errors = []
                //all known types. Start with fhir types. will add the types defined in the model
                //let types = ['string','CodeableConcept','CodeableConcept','Quantity','HumanName']

                let types = {}
                this.fhirDataTypes().forEach(function (code) {
                    types[code] = {}
                })



                //add to the models hash. Will update types with custom types (ie the models) using model.name
                //will check that all names are unique
                addToHash(vo.dataGroups)
                addToHash(vo.compositions)
                //addToHash(vo.valueSets)     //treat vs as a type for the purposes of validation

               // console.log(types)

                //now check all the models individually
                Object.keys(hash).forEach(function (key) {
                    let model = hash[key]

                    //If there's a parent, then check it's a valid type
                    if (model.parent) {
                        if (! types[model.parent]) {
                            errors.push({msg:`Unknown parent type ${model.parent} in model ${model.name}`,model:model})
                        }
                    }

                    //validations that are specifically for Compositions & datagroup
                    if (model.diff) {
                        model.diff.forEach(function (ed,inx) {
                            //this is an element definition

                            //check for required elements in ED. Currently only path.
                            if (! ed.path) {
                                errors.push({msg:`Missing path in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                            }

                            //check that the ED type is known
                            //todo - should our model allow multiple types
                            if (ed.type) {

                                ed.type.forEach(function (type) {
                                    if ( !types[type]) {
                                        errors.push({msg:`Unknown type ${ed.type} in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                                    }
                                })

                            } else {
                                errors.push({msg:`Missing type in model ${model.name} at diff #${inx}`,model:model, ED:ed})
                            }

                            /* currently not validating VS
                            if (ed.valueSet) {
                                //check that the valueSet name is present in the world or is a url.
                                //If a url, then not defined in the world
                                if (! types[ed.valueSet] && ed.valueSet.substring(0,4) !== 'http') {
                                    errors.push({msg:`Missing valueSet name ${ed.valueSet} in model ${model.name} at diff #${inx}. (It's not a Url either)`,model:model, ED:ed})
                                }
                            }
                            */

                            //todo check for duplicated names in the model

                        })
                    } else {
                        if (model.kind == 'dg') {
                            errors.push({msg:"Missing diff",model:model})
                        }

                    }




                })

                //only allowed elements in ED

                //all types are either to known FHIR datatypes or a composition or a datagroup

                return {errors:errors,types:types}


                function addToHash(hashModels) {
                    Object.keys(hashModels).forEach(function (key) {
                        let model = hashModels[key]
                        //the model name becomes a possible type

                        if (model.name) {
                            if (hash[model.name]) {
                                errors.push({msg:"Duplicate name",model:model})
                            } else {
                                hash[model.name] = model
                                types[model.name] = model
                            }
                        } else {
                            errors.push({msg:"Model missing name",model:model})
                        }

                    })
                }




                //



            }
        }
    })