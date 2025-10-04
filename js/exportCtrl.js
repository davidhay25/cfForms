angular.module("pocApp")
    .controller('exportCtrl',
        function ($scope,hashAllDG,hashAllCompositions,meta,utilsSvc,userMode,exportSvc) {

            //create the json & TSV download
            $scope.input = {}

            let fhirDT = utilsSvc.fhirDataTypes()

            let obj = {dg:hashAllDG,comp:hashAllCompositions}
            obj.meta = meta

            //variables for the Json downlaod
            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))

            $scope.downloadLinkJsonName = `allDataGroups.json`
            if (meta.name) {
                $scope.downloadLinkJsonName = `${meta.name}.json`
            }


            //variables for the spreadsheet downlaod
            let download = exportSvc.makeDGSimpleExport(hashAllDG)
            $scope.downloadLinkSS = window.URL.createObjectURL(new Blob([download ],{type:"application/json"}))

            $scope.downloadLinkSSName = `allDataGroups.tsv`
            if (meta.name) {
                $scope.downloadLinkSSName = `${meta.name}.tsv`
            }


            $scope.import = function () {

                $scope.$close($scope.uploadedWorld)
            }

            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;

                    let obj = angular.fromJson(data)
                    $scope.uploadedWorld = obj

                    $scope.uploadedDG = obj //this was the first version

                    if (obj.dg) {
                        $scope.uploadedDG = obj.dg
                    }

                    if (obj.comp) {
                        $scope.uploadedComp = obj.comp
                    }

                    $scope.uploadComplete = true

                    $scope.$digest()


                }

                //perform the read...
                r.readAsText(fileObject);
            }




            $scope.parseSS = function (file) {

                let cloneHashDG = angular.copy(hashAllDG)

                const cols = {
                    DGName: 0,
                    DGParent: 1,
                    DGTitle: 2,
                    DGDescription: 3,
                    EleName: 4,
                    EleTitle: 5,
                    EleType: 6,
                    EleDescription: 7,
                    EleCardinality : 8,
                    EleValueSet: 9,
                    EleNote: 10,
                    EleCode: 11

                }

                //let arLines = []
                let arLines = file.split('\n')

                //take off the first 2 lines
                arLines.splice(0,2)

                //Add all the DGs first. That means we can do type checking as we parse the other cintents
                for (const lne of arLines) {
                    let ar = lne.split(`\t`)
                    let DGName = ar[cols.DGName]

                    if (DGName && ! cloneHashDG[DGName]) {
                        //this is a new DG
                        let newDG = {kind: 'dg', name: DGName, title: ar[cols.DGTitle], diff: []}
                        newDG.id = utilsSvc.getUUID()
                        let parent = ar[cols.DGParent]
                        if (parent) {
                            newDG.parent = parent
                        }
                        cloneHashDG[DGName] = newDG
                    }
                }


                //let hashDG = {}
                let currentDG
                //now create the DG's from the file
                let errors = []
                let inx = 2     //line counter for errors
                for (const lne of arLines) {
                    let ar = lne.split(`\t`)
                    inx++
                    if (ar[cols.DGName] || ar[cols.EleName]) {



                        let DGName = ar[cols.DGName]
                        if (DGName) {

                            //check if this is a new DG. If one exists with the same name
                            //then update the elements from the SS - leave the others.
                            //this allows modification of other elements in the tool
                            currentDG = cloneHashDG[DGName]     //we know its there as we addded them above...

                        } else {
                            //these are elements in the DG currently being parsed

                            let path = ar[cols.EleName]

                            validatePath(currentDG,path,inx)

                            let isNewED = false

                            let ed
                            let ar1 = currentDG.diff.filter(ed => ed.path == path)
                            if (ar1.length == 1) {
                                ed = ar1[0]
                            } else {
                                isNewED = true
                                ed = {path: path}
                            }


                            let type = ar[cols.EleType]
                            if (! type) {
                                errors.push(`Line ${inx} - type is required`)
                            } else {
                                if (fhirDT.indexOf(type) > -1 || cloneHashDG[type]) {
                                    ed.type = [type]
                                } else {
                                    errors.push(`Line ${inx} - type '${type}' is unknown`)
                                }


                            }

                            ed.mult = ar[cols.EleCardinality] || "0..1"

                            let code = ar[cols.EleCode]
                            if (code) {
                                //format = code | display. system is snomed
                                let ar = code.split('|')
                                let coding = {system: 'http://snomed.info/ct'}
                                coding.code = ar[0].replace(/\s+/g, '');
                                if (ar[1]) {
                                    coding.display = ar[1]
                                }
                                ed.itemCode = coding
                            }

                            addIfNotEmpty(ed, 'title', ar, cols.EleTitle)
                            ed.title = ar[cols.EleTitle] || ar[cols.EleName]

                            addIfNotEmpty(ed, 'description', ar, cols.EleDescription)
                            addIfNotEmpty(ed, 'valueSet', ar, cols.EleValueSet)
                            addIfNotEmpty(ed, 'notes', ar, cols.EleNote)


                            if (isNewED) {
                                currentDG.diff.push(ed)
                            }

                        }
                    }
                }

                //console.log(cloneHashDG,errors)

                //if in collections mode, expand all the contained DG
                if ( userMode == 'playground') {
                    for (const key of Object.keys(cloneHashDG)) {
                        let dg = cloneHashDG[key]
                        delete dg.parent    //don't have parents in collection mode


                        //always work off the diff. todo ?what happens when a dg is passed in?

                        /*

                        if (dg.snapshot) {
                            //if there's a snapshot, then this DG was passed in.
                        } else {

                            console.log(dg.name)
                            let lst = []    //the nw diff list
                            addED(lst,dg)
                            dg.diff = lst
                            console.log(dg.diff)

                            delete dg.parent        //we don't support parents in collections mode
                        }

                        */
                    }


                }

                return {hashAllDG: cloneHashDG,errors:errors} //hashDG


                function addED(array,DG) {
                    for (let ed of DG.diff) {
                        let type = ed.type[0]
                        if (fhirDT.indexOf(type) > -1) {
                            //this is a FHIR DT
                            array.push(ed)
                        } else {
                            //This is another dg
                          //  ed.type = ['Group']
                         //   array.push(ed)
                            addED(array,cloneHashDG[type])
                        }

                    }

                }


                //check that the path is valid if a compound one
                // ? unique in DG
                //add to errors if invalid
                function validatePath(currentDG,path,inx) {
                    let hashPath = {}
                    currentDG.diff.forEach(function (ed) {
                        hashPath[ed.path] = true
                    })

                    let ar = path.split('.')
                    if (ar.length > 1) {
                        ar.pop() //
                        let parentPath = ar.join('.')
                        console.log(path,parentPath)
                        if (! hashPath[parentPath]) {
                            errors.push(`Line ${inx} - parent path  '${parentPath}' not found`)
                        }

                    } else {
                        //could check for uniqueness here

                        return true
                    }


                }

                function checkNotEmpty(v,message) {
                    if (! v) {
                        errors.push(message)
                        return false
                    }
                    return true

                }

                function addIfNotEmpty(obj,key,ar,inx) {
                    let v = ar[inx]
                    if (v) {
                        obj[key] = v
                    }

                }




                //console.log(arLines.length)

                //the second line has line numbers. in the second cell is the domain
               // let lne = arLines[1]
               // let ar1 = lne.split('\t')

            }

            $scope.importFromSS = function (file) {
                let vo = $scope.parseSS(file)




                if (vo.errors.length == 0) {
                    let hashDG = vo.hashAllDG
                    let world = {dg:hashDG,comp:{}}
                    $scope.$close(world)
                } else {
                    $scope.errors = vo.errors
                }


            }

        }
    )