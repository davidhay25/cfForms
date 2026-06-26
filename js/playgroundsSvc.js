angular.module("pocApp")

    .service('playgroundsSvc', function($http,utilsSvc,$q,$filter,snapshotSvc) {

        function addEd(dg,arCols,path,lineNumber,log,worldDG,componentDG) {
            //Add an ED to the DG
            let ed = {}
            ed.path =  path //arCols[9]  //`${currentPath}.${path}`


            ed.title = arCols[4] || arCols[5] || arCols[6] || ed.path
            ed.description = arCols[10]
            ed.mult = arCols[11] || '0..1'
            let type = arCols[12]
            ed.type = [type]

            if (fhirDataTypes.indexOf(type) == -1) {
                //This is not a FHIR datatype. It could be DG from the collection or a component
                //console.log(worldDG)

                //is it in the current collection
                if (worldDG[type]) {
                    // exists in collection
                    let msg = `The type ${type} exists in the current Collection`
                    log.push({severity:'info',path: ed.path,line:lineNumber,msg:msg})
                } else if (componentDG[type]) {
                    let msg = `The type ${type} is a Component not yet in the Collection`
                    log.push({severity:'info',path: ed.path,line:lineNumber,msg:msg,importFomComponent:true,type:type})
                    //is it in the component store
                    //if it is, it would be nice to import it directly into the collection - but should be a recursive function
                } else {
                    log.push({severity:'info',path: ed.path,line:lineNumber,msg:`DataType ${type} unknown`})
                }

                //todo check in the component store and the current collection



            }

            let vs = arCols[13]
            if (vs) {
                if (vs.indexOf('http') == -1) {
                    vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                }
                ed.valueSet = vs
            }
            // options - generally for CC
            let options = arCols[14]
            if (options) {
                let ar = options.split(',')
                ed.options = []
                for (const v of ar) {
                    ed.options.push({display:v})
                }
            }

            //the observable entity - itemCode. format in SS is display | code snomed assumed
            let code = arCols[15]
            if (code) {
                let ar = code.split('|')
                ed.itemCode = {display:ar[0]?.trim(),code:ar[1]?.trim(),system:'http://snomed.info/sct'}
                if (ar.length == 3) {
                    ed.itemCode.system = ar[2].trim()
                }
            }

            // let note = arCols[14]
            dg.diff.push(ed)

        }


        return {
/*
            parseSSDGOrig: function (text) {
                //parse from a spreadsheet into a DG
                //parse from a spreadsheet into a collection
                let arTable = []
                let arLines = text.split('\n')
                //arLines.splice(0,2)
                let fhirDataTypes = utilsSvc.fhirDataTypes()
                let log = []

                let lineNumber = 2

                let currentDG
                //let currentPath
                //let allDG = []


                for (let lne of arLines) {
                    let arCols = lne.split('\t')
                    lineNumber++

                    //let tabName = arCols[0]
                    let dgName = arCols[1]
                    //hard coded to 3 levels of nesting in any DG
                    let eleTitle = arCols[4]
                    //let eleTitle1 = arCols[5]
                    //let eleTitle2 = arCols[6]


                    if (dgName) {
                        //this is the start of a new DG in the current tab
                        console.log('new dg', dgName)
                        if (currentDG) {
                            //there should only be a single DG
                            log.push({line:lineNumber,msg:`There's a second DG in this input. Only 1 is allowed. `})
                            break   //stop processing

                        }
                        let description = arCols[3]
                        let title = arCols[2]
                        //currentPath = dgName
                        currentDG = {
                            kind: 'dg',
                            name: dgName,
                            id: utilsSvc.getUUID(),
                            title: title,
                            description: description,
                            diff: []
                        }
                        //currentTabDG.diff.push(currentDG)
                        continue
                    }

                    if (eleTitle) {
                        //this is the start of a new ED in the current DG
                        console.log('new ed', eleTitle)
                        addEd(currentDG, arCols, lineNumber,log)
                        continue
                    }

                }
                return {DG:currentDG,log:log}

            },
*/
            parseSSDG: function (text,worldDG,componentDG) {
                //let defer = $q.defer()



                //parse from a spreadsheet into a DG

                let arTable = []
                let arLines = text.split('\n')
                //arLines.splice(0,2)
                let fhirDataTypes = utilsSvc.fhirDataTypes()
                let log = []

                let lineNumber = 2

                let currentDG
                //let currentPath
                //let allDG = []

                let levelPath = {}

                for (let lne of arLines) {
                    //console.log(JSON.stringify(lne));
                    let arCols = lne.split('\t')
                    lineNumber++

                    //let tabName = arCols[0]
                    let dgName = arCols[1]
                    //hard coded to 3 levels of nesting in any DG
                    let eleTitle = arCols[4]
                    let eleTitle1 = arCols[5]
                    let eleTitle2 = arCols[6]

                    // Determine nesting level from title columns
                    let level = -1;

                    if (arCols[4]?.trim()) {
                        level = 0;
                    } else if (arCols[5]?.trim()) {
                        level = 1;
                    } else if (arCols[6]?.trim()) {
                        level = 2;
                    }
//console.log(level,eleTitle,eleTitle1,eleTitle2)

                    if (dgName) {
                        //this is the start of a new DG in the current tab
                        console.log('new dg', dgName)
                        if (currentDG) {
                            //there should only be a single DG
                            log.push({severity:'error',line:lineNumber,msg:`There's a second DG in this input. Only 1 is allowed. `})
                            break   //stop processing

                        }
                        let description = arCols[3]
                        let title = arCols[2]
                        //currentPath = dgName
                        currentDG = {
                            kind: 'dg',
                            name: dgName,
                            id: utilsSvc.getUUID(),
                            title: title,
                            description: description,
                            diff: []
                        }
                        //currentTabDG.diff.push(currentDG)
                        continue
                    }

                    if (eleTitle) {
                        //this is an ED at the root

                        let path = arCols[9]
                        if (! path) {
                            log.push({severity:'error',path: "path is missing",line:lineNumber,msg:`The Path is missing in the spreadsheet`})
                        }
                        //console.log('new ED - level 0', eleTitle, path)
                        levelPath[0] = path     //save the path at this level
                        addEd(currentDG, arCols, path, lineNumber,log,worldDG,componentDG)
                        continue
                    }

                    if (eleTitle1) {
                        //this is a child off a root
                        //console.log('new ed - level 1', eleTitle)
                        if (! arCols[9]) {
                            log.push({severity:'error',path: "path is missing",line:lineNumber,msg:`The Path is missing for ${eleTitle1}`})
                        }

                        let path = `${levelPath[0]}.${arCols[9]}`
                        levelPath[1] = path
                        addEd(currentDG, arCols, path, lineNumber,log,worldDG,componentDG)
                        continue
                    }

                    if (eleTitle2) {
                        //this is grandchild
                        //console.log('new ed - level 2', eleTitle)
                        //let path = `${levelPath[0]}.${levelPath[1]}.${arCols[9]}`
                        if (! arCols[9]) {
                            log.push({severity:'error',path: "path is missing",line:lineNumber,msg:`The Path is missing for ${eleTitle2}`})
                        }
                        let path = `${levelPath[1]}.${arCols[9]}`
                        levelPath[2] = path
                        addEd(currentDG, arCols, path, lineNumber,log,worldDG,componentDG)
                        continue
                    }



                }

                console.log(currentDG)

                //now check for duplicate pathe
                let hashPath = {}
                for (const [index, ed] of currentDG.diff.entries()) {
                    if (hashPath[ed.path]) {
                        log.push({severity:'error',path: ed.path ,line:index,msg:`The Path is duplicated.`})

                    }
                    hashPath[ed.path] = true
                }



                return {DG:currentDG,log:log}

            },

            parseSS: function(text) {
                //parse from a spreadsheet into a collection
                let arLines = text.split('\n')
                arLines.splice(0,2)
                let fhirDataTypes = utilsSvc.fhirDataTypes()
                let log = []

                let lineNumber = 2
                let currentTabDG
                let currentDG
                let currentPath
                let collection = {name:"new collection",id:utilsSvc.getUUID(),dataGroups:{}}

                for (let lne of arLines) {
                    let arCols = lne.split('\t')
                    lineNumber++

                    let tabName = arCols[0]
                    let dgName = arCols[1]
                    //hard coded to 3 levels of nesting in any DG
                    let eleTitle = arCols[4]
                    let eleTitle1 = arCols[5]
                    let eleTitle2 = arCols[6]

                    if (tabName) {
                        //a new tab. set up tabDG
                        console.log('new tab', tabName)
                        currentTabDG = {kind:'dg',name:tabName,id:utilsSvc.getUUID(), diff:[]}
                        collection.dataGroups[tabName] = currentTabDG

                        continue
                    }

                    if (dgName) {
                        //this is the start of a new DG in the current tab
                        console.log('new dg',dgName)
                        let description = arCols[3]
                        let title = arCols[2]
                        currentPath = dgName
                        currentDG = {kind:'dg',name:dgName,id:utilsSvc.getUUID(), title:title, description:description, diff:[]}
                        currentTabDG.diff.push(currentDG)
                        continue
                    }

                    if (eleTitle) {
                        //this is an element at the root
                        console.log('new ed',eleTitle)
                        addEd(currentDG,arCols,currentPath,lineNumber,log)
                        continue
                    }

                    if (eleTitle1) {
                        //this is the start of a child off the root
                        console.log('new ed',eleTitle1)
                        addEd(currentDG,arCols,currentPath,lineNumber,log)
                        continue
                    }


                }
                console.log(angular.toJson(collection,2))
                return {log:log,collection:collection}

                function addEdDEP(dg,arCols) {
                    let ed = {}
                    let path = arCols[9]
                    ed.path = `${currentPath}.${path}`
                    ed.description = arCols[10]
                    ed.mult = arCols[11] || '0..1'
                    let type = arCols[12]
                    ed.type = [type]
                    if (fhirDataTypes.indexOf(type) == -1) {
                        log.push({line:lineNumber,msg:`DataType ${type} unknown`})

                    }

                   // let vs = arCols[13]
                   // let note = arCols[14]
                    dg.diff.push(ed)

                }



            },

            getComponents : function (lst) {
                //retrieve all the named components in the list

                //generate the queries from the list of names
                let queries = []
                for (let entry of lst) {
                    queries.push(`frozen/${entry.type}`)
                }

                let promises = queries.map(function(query) {

                    return $http({
                        method: 'GET',
                        url: query
                    }).then(function(response) {

                        return {
                            query: query,
                            resource: response.data
                        };
                    });
                });

                return $q.all(promises);

            },

            fixConditionals : function (newDG) {
                //when a DG is replaced during SpreadSheet importing, this will copy the conditionals from old
                //to new. The source(path) of the ed will be the same, but the id will be different
                // THis will only work for conditionals within the elements
                // defined in this DG. Contained DG references will likely break and need manual fixing
                //it also copies specific other elements from the existing DG

                //the DG with the same name in the current collection
                let oldDG = snapshotSvc.getDG(newDG.name)
                //console.log(oldDG)
                if (! oldDG) {
                    //Shouldn't actually happen...
                    alert("Current DG not found. Can't update the conditionals")
                    return
                }

                //if the DG has extensions copy them over
                if (oldDG.adHocExtension) {
                    newDG.adHocExtension = oldDG.adHocExtension
                }

                //create hash of ED in the old DG.
                let hashOldED = {}     //hash of ED by path
                for (const ed of oldDG.diff) {
                    hashOldED[ed.path] = ed
                }

                //create hash of ED in the new DG.
                let hashNewED = {}     //hash of ED by path
                for (const ed of newDG.diff) {
                    hashNewED[ed.path] = ed
                }


                //now update the EWs and other key attributes from the 'old' DG
                for (const ed of newDG.diff) {
                    //console.log(ed.path)
                    if (hashOldED[ed.path]) {
                        //found the corresponding ED in the old DG
                        let edFromOld = hashOldED[ed.path]
                        //console.log(` --> found ${edFromOld.enableWhen}`)

                        // are there any conditionals?
                        if (edFromOld.enableWhen) {

                            for (let ew of edFromOld.enableWhen) {
                                let source = ew.source //The source item path

                                //drop the first segment - the DG name. The EW source path includes the DG name
                                source = $filter('dropFirstInPath')(source)

                                //look in the hash for the new DG to locate the element by path (so we can get the id)
                                if (hashNewED[source]) {
                                    // found it! Copy the EW to the new ED with an updated sourceId
                                    ed.enableWhen = ed.enableWhen || []
                                    ew.sourceId = hashNewED[source].id
                                    ed.enableWhen.push(ew)
                                    //console.log(`Changed id for ${ew.sourceId}`)
                                } else {
                                    console.error(`source path ${source} not found`)
                                }
                            }

                        }

                        //Other elements from the old that copy across
                        for (const eleName of  ['controlHint','definition','prePop','hiddenInQ','options','mult']) {
                            if (edFromOld[eleName]) {
                                ed[eleName] = edFromOld[eleName]
                            }
                        }

                        //any extensions? Note that these are adHoc extensions
                        if (edFromOld.adHocExtension) {
                            ed.adHocExtension = edFromOld.adHocExtension
                        }

                    }


                }



            },

            getVersions : function (pgId) {
                let deferred = $q.defer()
                let qry = `/playgroundVersion/${pgId}`
                $http.get(qry).then(
                    function (data) {
                        deferred.resolve(data.data)
                    }, function (err) {
                        deferred.reject(err)
                    }
                )

                return deferred.promise

            },

            saveAsVersion : function (pg) {
                //Inflate the playground and save as a version
                let deferred = $q.defer()

                //todo - inflate all the contained DG's for container DG's
                //only these will be in the version

                //post the playground to the version API. It will be rejected is there are duplicate versions
                $http.post(`playgroundVersion`,pg).then(
                    function (data) {
                        deferred.resolve()
                    }, function (err) {
                        deferred.reject(err)

                        //alert(angular.toJson(err.data))
                    }
                )

                return deferred.promise

            },

            currentPlaygroundDiff : function (currentPG, initialPG) {
                //look for diffs between the pg (which is the current PG) and initialPG (which was originally loaded)
                //for now, a simple json based comparison of DGs - later could be a more detailed diff
                if (! initialPG || ! initialPG.dataGroups || ! currentPG) {
                    return {}
                }




                let response = {}    //dgnames that are different
                let hashInitialDGs = {}     //hash by name of DGs in the initial load
                //create a hash of all DGs in the initial load
                for (const key of Object.keys(initialPG.dataGroups)) {
                    hashInitialDGs[key] = simpleHash(angular.toJson(initialPG.dataGroups[key]))
                }
/*
                //look for new DGs
                for (const key of Object.keys(currentPG.dataGroups)) {
                    if (! hashInitialDGs[key]) {
                        response[key] = [{msg:"This is a new DG"}]
                    }
                }
*/
                //for (const dg of pg.dataGroups) {
                for (const key of Object.keys(currentPG.dataGroups)) {
                    if (hashInitialDGs[key]) {
                        //the DG is still there, has it changed?
                        let initialHash = hashInitialDGs[key]
                        let currentHash = simpleHash(angular.toJson(currentPG.dataGroups[key]))

                        //currentHash = angular.toJson(currentPG.dataGroups[key])
                        //initialHash = angular.toJson(initialPG.dataGroups[key])

                        if (initialHash !== currentHash) {
                            response[key] = [{type:"changed",msg:"DG was changed"}]
                        }

                    } else {
                        //the DG was deleted
                        response[key] = [{type:"added",msg:"DG was added"}]
                    }

                }

                //look for deleted DGs
                for (const key of Object.keys(initialPG.dataGroups)) {
                    if (! currentPG.dataGroups[key]) {
                        response[key] = [{type:"deleted",msg:"This is a deleted DG"}]
                    }
                }

                return response


                function simpleHash(str) {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        const chr = str.charCodeAt(i);
                        hash = (hash << 5) - hash + chr; // same as hash * 31 + chr
                        hash |= 0; // Convert to 32-bit integer
                    }
                    return hash;
                }


            },

            savePlaygroundDEP : function (pg,email) {
                let deferred = $q.defer()
                $http.get(`playground/${$localStorage.world.id}`).then(


                )

                return deferred.promise

            },

            //components
            getImportableDG: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //These are DG's that have been exported as 'frozen'
                //re-named as 'componnets
                let arImport = []
                $http.get('allfrozen').then(
                    function (data) {

                        for (const dg of data.data) {
                            if (hashAllDG[dg.name]) {
                                dg.nameExists = true
                            }

                            arImport.push(dg)
                        }

                        arImport.sort(function (a,b) {
                            if (a.title > b.title) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        deferred.resolve(arImport)

                    }, function (err) {
                        //at least retun the simple ones
                        deferred.reject(err)
                    }
                )

                return deferred.promise


            },

                getImportableDGDEP: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //right now, it's those that have no parents and only FHIR datatype elements

                let hash = {}

                let fhirDT = utilsSvc.fhirDataTypes()
                let arImport = []

                let qry = `/model/allDG`
                    $http.get(qry).then(
                    function (data) {
                        let libraryDG = data.data
                        for (const dg of libraryDG) {
                            if (! dg.parent && dg.diff) {
                                let canImport = true
                                for (const ed of dg.diff) {
                                    let type = ed.type[0]
                                    if (fhirDT.indexOf(type) == -1) {
                                        canImport = false
                                        break
                                    }
                                }
                                if (canImport) {
                                    //there are some values and this DG name not already in use
                                    if (dg.diff.length > 0 && ! hashAllDG[dg.name]) {
                                        hash[dg.name] == true
                                        arImport.push(dg)
                                    }

                                }

                            }
                        }


                        //now get the frozen DGs
                        $http.get('allfrozen').then(
                            function (data) {
                                data.data.forEach(function (dg) {
                                    //can import if not already marked for import & the name is not already used...
                                    if (! hash[dg.name] && ! hashAllDG[dg.name]) {
                                        arImport.push(dg)
                                    }


                                })
                                deferred.resolve(arImport)

                            }, function (err) {
                                //at least retun the simple ones
                                deferred.resolve(arImport)
                            }
                        )




                    }, function (err) {
                        console.error(angular.toJson(err.data))
                            deferred.reject(angular.toJson(err.data))
                    })

                return deferred.promise

            }
        }}
    )