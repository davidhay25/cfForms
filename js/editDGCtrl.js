angular.module("pocApp")
    .controller('editDGCtrl',
        function ($scope,model,hashTypes,hashValueSets,isNew,modelsSvc,snapshotSvc, parent,$localStorage,
                  utilsSvc, modelDGSvc,$http,userMode,$uibModal,$timeout,$filter,viewVS,modelReviewSvc) {


            //if parent is set, then 'isNew' will be also...

            $scope.model =  angular.copy(model)     //edit a copy of teh DG
            $scope.input = {}
            $scope.edit = {}
            $scope.isNew = isNew        //if new, then allow the model metadata to be set
            $scope.userMode = userMode

            $scope.input.fixedValues = []   //all the fixed values defined by this DG (not shared like Named Queries)


            //$scope.input.pastedQ = $localStorage.pastedQ    //todo just when developing
            $scope.input.parseMakeGroup = true

            $scope.fillQ = function () {
                $scope.input.pastedQ = $localStorage.pastedQ
            }

            //when a DG is to be created from a Q
            $scope.pasteQ = function (Qstring) {

                let testQ = {}
                try {

                    let vo = modelReviewSvc.convertICCR(JSON.parse(Qstring),$scope.input.parseMakeGroup)
                    testQ = vo.Q
                    console.log(vo.Q)
                    let vo1 = modelReviewSvc.makeDG(testQ)

                    //console.log(vo1.dg)
                    $scope.model = vo1.dg
                    $scope.input.newModelName = $scope.model.name
                    $scope.checkName($scope.input.newModelName)
                    $scope.input.newModelTitle= $scope.model.title

                    $localStorage.pastedQ = Qstring //todo just when developing
                    alert("DG has been created from the Q. Details visible on other tabs.")

                } catch (ex) {
                    console.log(ex)
                    alert("This is not a valid Json string")
                    return
                }







            }




            //construct a has of all types (DT + FHIR) for the full list of elements routine
            //construct a has of all types (DT + FHIR) for the full list of elements routine
            $scope.allTypes = angular.copy(hashTypes)

            //frozen DG - ie components - for the linked option
            $http.get('allfrozen').then(
                function (data) {

                    //only from library (LIM)
                   // $scope.allFrozen = data.data.filter(dg => dg.source == 'library')

                    //change to all components
                    $scope.allFrozen = data.data
                    $scope.hashTranslate = {'playground':"Collection","library": "LIM"}

                    $scope.allFrozen.sort(function (a,b) {
                        if (a.title > b.title) {
                            return 1
                        } else {
                            return -1
                        }

                    })

                    populateControls()

                },function (err) {
                    alert(angular.toJson(err))
                    $scope.allFrozen = []
                    populateControls()      //even in error
                }
            )


            //create a list of potential parent types for a new DG -
            $scope.input.possibleParents = []
            Object.keys(hashTypes).forEach(function (key) {
                if (hashTypes[key].kind == 'dg') {      //should only be DG

                    if (isNew) {
                        $scope.input.possibleParents.push(key)
                    } else {
                        if (model && key !== model.name) {
                            //can't be a parent to itself
                            $scope.input.possibleParents.push(key)
                        }
                    }

                }
            })
            $scope.input.possibleParents.sort()


            //set the type for an ed. Only for a new one
            $scope.setType = function (){
                $uibModal.open({
                    templateUrl: 'modalTemplates/changeType.html',
                    //backdrop: 'static',
                    size : 'xlg',
                    controller: 'changeTypeCtrl',

                    resolve: {
                        ed: function () {
                                return {}


                        },
                        hashAllDG: function () {
                            return $scope.allTypes
                        }
                    }

                }).result.then(function (vo) {
                    if (vo.class == 'dg') {
                        $scope.input.type = vo.value.name
                    } else {
                        $scope.input.type = vo.value
                    }

                })
            }


            $scope.deleteParent = function () {
                if (confirm("Are you sure you wish to remove the parent?")) {
                    delete $scope.model.parent      //delete on the model
                    delete $scope.input.newModelParent //update the UI
                    getFullElementList()    //update the full element list
                }
            }



            //Load all the Named queries
            function loadNamedQueries() {
                let qry = "model/namedquery"
                $http.get(qry).then(
                    function (data) {
                        $scope.namedQueries = data.data

                        $scope.input.nq = {}    //this is a hash of all named queries in the model
                        if ($scope.model && $scope.model.namedQueries) {
                            for (const nqName of $scope.model.namedQueries) { //the dg has only the name

                                //only add to the input.nq if the named query actually exists.
                                //otherwise it will be removed from the DG
                                if ($scope.namedQueries.filter(item => item.name == nqName).length > 0) {
                                    $scope.input.nq[nqName] = true
                                }

                            }
                        }

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }
            loadNamedQueries()



            //check that there isn't a circular loop. Each DG should only once in the hierarchy
            function checkParentalHierarchy(parentName) {
                let hashParent = {}

                let model = $scope.allTypes[parentName]

                return ! modelDGSvc.hasDuplicatedParent(model,hashTypes)



            }
            //leave at the top as called when creating a new DG with a parent

            $scope.setModelAttribute = function(attribute,value) {
                $scope.model[attribute] = value

                if (attribute == 'parent') {

                    //if changing the parent, then re-generate the expanded model

                    //check that there isn't a circular loop by checking that a given DG only
                    //occurs once in the chain


                    if (checkParentalHierarchy(value)) {
                        getFullElementList()
                    } else {
                        //turn off the parent
                        delete $scope.model.parent
                        delete $scope.input.newModelParent

                    }

                }

            }


            //create the list of DG's that can be added as child elements. Don't include this one...
            if (isNew) {
                $scope.input.types = Object.keys(hashTypes) //an array for the new type dropdown

                $scope.input.termSvr = 'https://test.canshare.co.nz/proxy'


            } else {
                //all DFGs that contain this one...
                //$scope.dgContainingThis = snapshotSvc.dgContainedBy(model.name)

                //permitted input types
                $scope.input.types = []

                let ar = Object.keys(hashTypes)
                ar.forEach(function(type) {
                    if (type !== model.name) {
                        $scope.input.types.push(type)
                    }
                })
            }


            $scope.input.types.push("display")

            $scope.input.types.sort()

            //now add the FHIR datatypes
            $scope.input.types = utilsSvc.fhirDataTypes().concat($scope.input.types) //.concat(modelsSvc.fhirDataTypes())


            //get the full list of elements for a DG, following any inheritance chain..
            function getFullElementList() {
                if ($scope.model.name) {    //if creating a new child (with a parent) the name may not be there - or if the parent is set before the name
                    $scope.allElements = snapshotSvc.getFullListOfElements($scope.model.name)// vo.allElements

                }
            }




            //if not new, set the UI names & parent
            //the editing is directly on the $scope.model (there's an onchange handler that updates it as these values are changed


            function populateControls() {
                if (! isNew) {

                    $scope.input.newModelName = model.name
                    $scope.input.newModelTitle = model.title
                    $scope.input.sourceReference = model.sourceReference
                    $scope.input.newModelDescription = model.description
                    $scope.input.isContainer = model.isContainer
                    $scope.input.isTabbedContainer = model.isTabbedContainer

                    $scope.input.idVariable = model.idVariable

                    $scope.input.namedQueries = model.namedQueries          //the array of named queries this DG requires...
                    $scope.input.type = model.type
                    if (model.parent) {
                        $scope.input.newModelParent = model.parent
                    }

                    $scope.input.fixedValues = model.fixedValues || []
                    $scope.input.resourceReferences = model.resourceReferences || []

                    $scope.extractedResources =  snapshotSvc.getExtractableDG(model.name)

                    $scope.input.adHocExt = model.adHocExt

                    $scope.input.termSvr = model.termSvr

                    $scope.input.qVersion = model.qVersion
                    $scope.input.qUrl = model.qUrl

                    if (model.linkedDG) {
                        //set the 'linkedDG' control to the selected model
                        //let ar = $scope.allFrozen.filter(dg => dg.name == model.linkedDG)
                        let ar = $scope.allFrozen.filter(dg => dg.name == model.linkedDG)


                        if (ar.length >0) {
                            $scope.input.linkedDG = ar[0]
                            if (ar.length > 1) {
                                alert(`${ar.length} components found with the name ${model.linkedDG}. Selecting the first one.`)
                            }
                        }
                    }

                    //input.linkedDG
                    //$scope.input.linkedDG = model.linkedDG


                    if (model.obsExtract) {
                        $scope.input.obsExtract = true
                    }


                    getFullElementList()


                } else {
                    if (parent) {
                        //if there's a parent passed in for a new DG, then set the parent dropdown

                        for (name of $scope.input.possibleParents) {
                            if (name == parent.name) {
                                $scope.input.newModelParent = name
                                $scope.setModelAttribute('parent',name)
                                break
                            }
                        }

                    }
                }
            }

            $scope.input.cards = ["0..1","1..1","0..*",'1..*']
            $scope.input.card = $scope.input.cards[0]

            $scope.canEdit = function (element) {
                //can the element be overridden - ie it comes from a referenced datatype not defined directly on the model
                let ar = element.path.split('.')
                if (ar.length > 2) {
                    return true
                }
            }

            //called for name onBlur to expand the DG if there is a parent.
            //mainly needed when a DG child is created and there's a parent before a name
            $scope.checkExpand = function () {

                $scope.model.name = $scope.input.newModelName
                $scope.model.title = $scope.model.title || $scope.model.name
                $scope.input.newModelTitle = $scope.model.title
                getFullElementList()

            }

            $scope.checkName = function (name) {

                if (name) {
                    if (name.indexOf(" ") > -1) {
                        alert("Name cannot contain spaces")
                        $scope.input.newModelName = $scope.input.newModelName.replace(/\s/g, "");
                        return
                    }

                    if (['root'].indexOf(name) > -1) {
                        alert(`The name: ${name}  is not allowed.`)
                        return
                    }


                    $scope.model.name = name  //we can use the 'isUnique' to know if the model can be added

                    if (userMode == 'library') {
                        modelsSvc.isUniqueNameOnLibrary(name,'dg').then(
                            function () {
                                //name is unique
                                $scope.isUnique = true
                            }, function (err) {
                                $scope.isUnique = false
                            }
                        )
                    } else {
                        //this is playground mode
                        $scope.isUnique = true
                        if (hashTypes[name]) {
                            $scope.isUnique = false
                        }
                    }
                }
            }

            $scope.isRequired = function (element) {
                if (element.ed && element.ed.mult && element.ed.mult.substring(0,1) == 1) {
                    return true
                }

            }





            //check if this path has been used in the DG
            $scope.checkDuplicatePath = function(path) {

                if (path.includes(" ")) {
                    alert("Path cannot contain spaces")
                    return
                }

                $scope.isDuplicatePath = false
                if ($scope.allElements) {
                    $scope.allElements.forEach(function (element) {
                        //element.ed.path = full path
                        let ar = element.ed.path.split('.')
                        if (ar[ar.length-1] == path) {
                            $scope.isDuplicatePath = true
                        }
                    })
                }
            }

            //called when a new element is being added. This is linked to the element name
            $scope.setTitle = function (name) {
                if (name && ! $scope.input.title) {
                    $scope.input.title = name.charAt(0).toUpperCase() + name.slice(1)
                }
            }

            $scope.cancel = function () {
                if (confirm("Are you sure you want to close without saving any changes?")) {
                    $scope.$dismiss()
                }
            }


            //add a new item
            $scope.add = function () {
                let element = {}
                element.id = utilsSvc.getUUID()
                element.path = $scope.input.path
                element.title = $scope.input.title
                element.type = [$scope.input.type]
                element.description = $scope.input.description

                element.mult = $scope.input.card
                $scope.model.diff = $scope.model.diff || []
                $scope.model.diff.push(element)

                delete $scope.input.path
                delete $scope.input.title
                delete $scope.input.type
                delete $scope.input.code
                delete $scope.input.valueSet
                $scope.input.card = $scope.input.cards[0]

                getFullElementList()
            }


            $scope.remove = function (inx) {
              //  if (confirm("Are you sure you wish to remove this element")) {
                //todo - check for children
                let pathToDelete = $scope.model.diff[inx].path
                let ar = [pathToDelete]
                for (const ed of $scope.model.diff) {
                    if (ed.path.isChildPath(pathToDelete)) {
                        ar.push(ed.path)
                    }
                }

                if (ar.length == 1) {
                    //no children - just delete it
                    $scope.model.diff.splice(inx,1)
                } else {
                    if (confirm(`There are ${ar.length -1} children that will also be deleted. Are you sure?`)) {
                        let ar1 = $scope.model.diff
                        $scope.model.diff = []
                        for (const ed of ar1) {
                            if (ar.indexOf(ed.path) == -1) {
                                $scope.model.diff.push(ed)
                            }
                        }


                    }
                }
                //alert(ar.length)

                  //temp  $scope.model.diff.splice(inx,1)
                    getFullElementList()
             //   }
            }

            $scope.moveUp = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx-1,0,ar[0])
                getFullElementList()
            }

            $scope.moveDn = function (inx) {
                let ar = $scope.model.diff.splice(inx,1)
                $scope.model.diff.splice(inx+1,0,ar[0])
                getFullElementList()
            }


            $scope.save = function () {


                $scope.model.type = $scope.input.type

                //todo - should this be $scope - need to re-write so cancel works properly!!!
                $scope.model.fixedValues = $scope.input.fixedValues
                $scope.model.resourceReferences = $scope.input.resourceReferences
                $scope.model.isContainer = $scope.input.isContainer
                $scope.model.qUrl = $scope.input.qUrl

                delete $scope.model.isTabbedContainer
                if ($scope.model.isContainer && $scope.input.isTabbedContainer) {
                    $scope.model.isTabbedContainer = true
                }


                $scope.model.idVariable = $scope.input.idVariable
                $scope.model.termSvr = $scope.input.termSvr
                if ($scope.input.linkedDG) {
                    $scope.model.linkedDG = $scope.input.linkedDG.name
                } else {
                    delete $scope.model.linkedDG
                }

                if ($scope.input.obsExtract) {
                    $scope.model.obsExtract = true
                } else {
                    delete $scope.model.obsExtract
                }

                //update the named queries
                delete $scope.model.namedQueries

                for (const key of Object.keys($scope.input.nq)) {
                    if (key && $scope.input.nq[key]) {
                        $scope.model.namedQueries = $scope.model.namedQueries || []
                        $scope.model.namedQueries.push(key)
                    }
                }

                //make sure all eds have an id
                if ($scope.model.diff) {
                    $scope.model.diff.forEach(function (ed) {
                        ed.id = ed.id || utilsSvc.getUUID()
                    })
                }

                if (isNew) {
                    if ($scope.isUnique) {
                        $scope.model.diff = $scope.model.diff || []

                      //  $scope.$close($scope.model)
                    } else {
                        alert("The name is not valid - likely a duplicate")
                        return
                    }
                }

                //always pass back the model
                $scope.$close($scope.model)
            }


            //from the base elements - there's a sort option

            $scope.sort = function () {

                let lst = []
                let hash = {}
                $scope.model.diff.forEach(function (ed) {
                    lst.push(ed.path)
                    hash[ed.path] = ed
                })
                console.log(angular.toJson(lst))

                let lst1 = sortHierarchicallyWithFirstAppearance(lst)
                $scope.model.diff = []
                lst1.forEach(function (path) {
                    $scope.model.diff.push(hash[path])
                })
                console.log(lst1)
                console.log(angular.toJson(lst1))
            }

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
                        node[subPath] = node[subPath] || { children: {}, order: firstAppearance[subPath] };
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



            //when editing a path in the 'base model content' tab
            $scope.editPath = function (ed) {
                let newPath = prompt("Enter new path",ed.path)
                if (newPath) {
                    ed.path = newPath
                }
            }

            $scope.viewVS = function (url) {
                viewVS(url)
            }

            $scope.moveAfter = function (pos,element) {
                let path = $filter('lastInPath')(element.path)
                let msg = `This is row ${pos+1} (${path}). Enter the row number to move this row to.`
                const input = prompt(msg);

                if (input !== null) {
                    let newPos = Number(input);
                    if (!isNaN(newPos)) {
                        //alert(`You entered: ${newPos}`);
                        newPos--
                        if (newPos > 0 && newPos < $scope.model.diff.length-1) {
                            const [row] = $scope.model.diff.splice(pos,1)
                            if (newPos > pos) (
                                newPos--
                            )

                           // $timeout(() => {
                                $scope.model.diff.splice(newPos,0,row)
                          //  });



                        }


                    } else {
                        alert("That's not a valid number!");
                    }
                }


            }




            //-========================   redundant  ==============


            //return true if there is an override element in the model for this path..
            $scope.hasBeenOverridden = function(element) {
                //the path in the model.diff won't have the first field
                if (! $scope.model || !$scope.model.diff) {
                    //when adding a new DG
                    return false
                }

                //todo - not sure why there are elements with no ed...
                if (! element.ed || !element.ed.path) {
                    console.log ("missing ed or path",element)
                    return  false
                }

                let ar = element.ed.path.split('.')

                if (ar.length == 2){
                    return false // defined in the model
                }
                ar.splice(0,1)
                let pathToCompare = ar.join('.')
                let result = false
                $scope.model.diff.forEach(function (e) {
                    if (e.path == pathToCompare) {
                        result = true
                    }
                })
                return result
            }



            //select an element from the expanded elements list
            $scope.selectElement = function (element) {
                //locate the element in the allElements array. This is that setting/removing override can update the contents

                for (const el of $scope.allElements) {
                    if (el.path == element.path) {
                        $scope.selectedElementOverridden = $scope.hasBeenOverridden(el)
                        $scope.selectedElement = el
                        break
                    }
                }
            }



            $scope.validateJson = function(value,displayErr) {
                //let v = value
                if (! value) {
                    return
                }
                try {
                    //try to convert to an object. If it isn't then the value remins simple
                    let v = angular.fromJson(value)
                    let ok = true
                    let msg = "All good. The Json is valid"
                    if (! Array.isArray(v)) {
                        msg = "It's json, but must be an array"
                        ok = false
                    }

                    if (displayErr) {
                        alert(msg)
                    }
                    return ok
                } catch (ex) {
                    if (displayErr) {
                        alert("There is a problem. The Json is invalid. Are you using double quotes?")
                    }
                    return false
                }
            }



            //----------- resource references

            $scope.getPathsForSource = function (rrSource) {

                //get all the elements in the source Resource that are references
                //called when both source and target resources are known so that the list is only valid references
                //let fhirType = rrSource.type


                if ($scope.input.rrSource && $scope.input.rrTarget) {

                    let qry = `/fsh/fhirtype/${$scope.input.rrSource.fhirType}`
                    $http.get(qry).then(
                        function (data) {
                            let arElements = data.data
                            let sourceProfile = `http://hl7.org/fhir/StructureDefinition/${$scope.input.rrTarget.fhirType}`
                            console.log(data.data)
                            $scope.definitions = []
                            arElements.forEach(function (el) {
                                if (el.types) {
                                    for (const typ of el.types) {
                                        if (typ.code == 'Reference' && typ.targetProfile) {
                                            for (const prof of typ.targetProfile) {

                                                if (prof == sourceProfile || (prof == 'http://hl7.org/fhir/StructureDefinition/Resource')) {

                                                    $scope.definitions.push(el)
                                                    break
                                                }
                                            }


                                        }
                                    }
                                }
                            })
                            console.log($scope.definitions)
                        }

                    )


                }

            }

            $scope.addRR = function (source,definition,target,adHocDefinition) {
                //target could be a string or an object with a property of path
                $scope.input.resourceReferences = $scope.input.resourceReferences || []
                //create the name that will be used in the allocateID extension

                //let ar = target.path.split('.')
                //connnectathon todo
                let def = adHocDefinition
                if (definition && definition.path) {
                    def = definition.path
                }

                //let rr = {source:source.path,definition:definition.path,target:path}
                let rr = {source:source.path,definition:def,target:target.path}
                //let rr = {source:source.path,definition:definition.path,target:target.path}
                $scope.input.resourceReferences.push(rr)
                delete $scope.input.rrSource
                delete $scope.input.rrDefinition
                delete $scope.input.rrTarget

            }

            $scope.removeRR = function (inx) {
                $scope.input.resourceReferences.splice(inx,1)
            }

            //fixed value stuff
            $scope.addFixedValue = function (path,type,value) {

                let v = value
                try {
                    //try to convert to an object. If it isn't then the value remins simple
                    v = angular.fromJson(value)
                } catch (ex) {

                }



                let fv = {path:path,type:type}
                fv.value = v
                $scope.input.fixedValues.push(fv)
                delete $scope.input.fvPath
                delete $scope.input.fvType
                delete $scope.input.fvValue
            }

            $scope.removeFixedValue = function (inx) {
                $scope.input.fixedValues.splice(inx,1)
            }



            $scope.extBuilder = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/makeSDCExtension.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'makeSDCExtensionCtrl',
                    resolve: {
                        elements: function () {
                            return $scope.allElements
                        }, currentPath : function () {
                            return model.name
                        }
                    }
                }).result.then(function (ext) {

                    if (ext) {
                        $scope.model.adHocExtension = $scope.model.adHocExtension || []
                        $scope.model.adHocExtension.push(ext)
                        // $scope.input.adHocExt = angular.toJson(ext,true)
                    }

                    /*

                    let json = angular.toJson(ext,true)

                    if ($scope.input.adHocExt) {
                        let l = $scope.input.adHocExt.length
                        $scope.input.adHocExt = $scope.input.adHocExt.substring(0,l-1) + "," + json + '\n]'

                    } else {
                        $scope.input.adHocExt = `[${json}]`
                    }
*/

                })

            }



            /*
                        $scope.editAdHocExtension = function (ed) {
                            $uibModal.open({
                                templateUrl: 'modalTemplates/adHocExtension.html',
                                backdrop: 'static',
                                size : 'lg',
                                controller: 'adHocExtensionCtrl',
                                resolve: {
                                    currentExt: function () {
                                        return ed.adHocExtension
                                    }
                                }
                            }).result.then(function (ext) {

                                if (ext) {

                                }
                            })
                        }

            */



        }
    )