angular.module("pocApp")

    .service('snapshotSvc', function(utilsSvc,$filter) {

        //also a copy in modelsSvc
        //fhirDataTypes = ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']

        fhirDataTypes = utilsSvc.fhirDataTypes()

        allDgSnapshot = {}      //a hash of all DGs with snapshots
        lstAllDG = []           //an alphabetical list of all DGs by name
        lstAllDGTitle = []      //an alphabetical list by title
        logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
        log = []                //the main log
        //errors = []
        logIndex=0              //An incremental index for log entries
        hashHierarchy = {}      //the hierarchy for each dg
        hashReferences = {}     //references by DG. This is used for the summary - not in processing...
        hashHistory = {}        //history of changes as the dg hierarchy is traversed
        hashChildren = {}       //all direct children for a DG - used for the summary

        focusDGName = ""        //if set, will log processing details of this DG. For debugging


        //Before creating the snapshots
        function clearInternalCaches() {
            allDgSnapshot = {}      //a hash of all DGs with snapshots
            lstAllDG = []           //an alphabetical list of all DGs
            lstAllDGTitle = []      //an alphabetical list by title
            logToConsole = false    //whether to log to console. Passed in the makeSnapshots call
            log = []                //the main log
            logIndex=0              //An incremental index for log entries
            hashHierarchy = {}      //the hierarchy for each dg
            hashChildren = {}       //all direct children for a DG - used for the summary
            hashReferences = {}     //references by DG. This is used for the summary - not in processing...
            hashHistory = {}        ////history of changes as the dg hierarchy is traversed
            focusDGName = ""        //if set, will log processing details of this DG. For debugging
        }


        function specificLogger(dgName,msg,obj) {
            //will log to console the specific processing for this DG
            if (dgName === focusDGName) {
                console.log(msg)
                if (obj) {
                    console.log(obj)
                }
            }
        }

        function logger(msg,dgName,isError,details) {
            if (logToConsole) {
                console.log(dgName,msg)
            }

            let logEntry = {msg:msg,dgName:dgName,isError:isError,index:logIndex++}
            if (details) {
                logEntry.details = details
            }
            log.push(logEntry)
        }

        function getFirstPathSegmentDEP(path) {
            let ar = path.split('.')
            let firstSegment = ar[0]
            return firstSegment
        }


        //When a DG overrides an element in an imported reference, the element will duplicate as it will be brought in
        //with the references DG as well as present as the override diff. We remove them here into a separate
        //element on the DG (as a hash) and apply them once the snapshot has been completely created
        //note that the override only contains overrides for references.
        function createDgOverrideDEP(dg) {

            //so we first create a hash containing all references
            let hashReferenceEds = {}
            dg.fullDiff.forEach(function (ed) {
                let type = ed.type[0]
                if (fhirDataTypes.indexOf(type) == -1) {
                    //this is a reference to a DG
                    //let firstSegment = getFirstPathSegment(path)
                    //hashReferenceEds[firstSegment] = true
                    hashReferenceEds[ed.path] = true
                    //console.log(dg.name,firstSegment)
                }
            })

            //now create the override list, and remove the overrides from the full Diff

            let newFullDiff = []        //this will be a full diff with the overrides removed
            dg.fullDiff.forEach(function (ed) {

                //check each one against the hash of reference elements.
                let isOverride = false
                for (const key of Object.keys(hashReferenceEds)) {
                    if (ed.path.isChildPath(key)) {
                        isOverride = true

                        dg.overrides = dg.overrides || {}
                        dg.overrides[ed.path] = angular.copy(ed)
                        break
                    }
                }


                //it wasn't an override, so it stays in the fulldiff
                if (! isOverride) {
                    newFullDiff.push(ed)
                }


            })
            dg.fullDiff = newFullDiff
        }


        //apply the hierarchy of DG that lead to this one and save in .fullDiff
        //also add them to the snapshot
        function makeFullDiff(dg,allDg) {

            specificLogger(dg.name,"Starting creation of full diff")

            let arHierarchy = makeDgHierarchy(dg,allDg)     //the list of DG's that are parents of this one

            specificLogger(dg.name,"DG Heirarchy",arHierarchy)

            //the ultimate parent is the last one...
            dg.ultimateParent = arHierarchy[arHierarchy.length-1]

            dg.fullDiff = []        //this is a complete list of diffs from the entire hierarchy ordered from the ultimate parent down
            dg.snapshot = []        //the definitive snapshot of all elements in order


            //now, create a diff array that has all elements
            let arFullDiffPath = []     //will contain paths of all elements in the expanded DG
            let hashEdPath = {}         //a hash, keyed by path than has the DG at that path. This may be replaced by subsequent DG's in the hierarchy
            let arHx = []               //history of changes made by each DG. will contain {dgName: changes:[]}
            hashHistory[dg.name] = arHx //

            //move down the hierarchy, parent first
            for (let i=arHierarchy.length-1;i > -1;--i) {
                let dgName = arHierarchy[i]

                specificLogger(dg.name,`EDs from ${dgName}`)

                let changesThisDg = []      //changes made by diffs in this parental DG
                arHx.push({dgName:dgName,changes:changesThisDg})

                let cDg = allDg[dgName]  //cDg = component Dg.
                //let cDg = angular.copy(allDg[dgName])  //cDg = component Dg.
                for (const ed1 of cDg.diff) {



                    let ed = angular.copy(ed1)

                    //temp delete ed.sourceModelName   //the previous version saved this in the DG. I prefer to add it here.

                    //if the datatype is not a FHIR datatype - it's another DG - then it will need to have the members inserted
                    //into the target DG immediately after this element - once it's been inflated...
                    let type = ed.type[0]
                    if (fhirDataTypes.indexOf(type) == -1) {
                        ed.dgToBeInserted = type   //this is the type (same as DG name) to be inserted here. We clear the flag when inserting
                    }

                    //does this ed already exist in the full diff (based on the path)
                    let path = ed.path

                    let pos = arFullDiffPath.indexOf(path)

                    ed.sourceModelName = dgName     //the DG where this ed was added.
                    if (pos == -1) {

                        //no it doesn't  - add it to the list.
                        // *** Even if it is 0..0 - it could be removing part of a referenced DG  from a parent so we need it for later
                        specificLogger(dg.name,`Adding ${path} ${ed.type[0]} (${ed.mult})`)
                        arFullDiffPath.push(path)
                        hashEdPath[path] = ed   //and store the ed in the hash
                        changesThisDg.push({msg:`Added ${ed.path}`,ed:ed })


                    } else {
                        //yes, it already exists
                        //update the hash with the new ed
                        specificLogger(dg.name,`Replacing ${path} ${ed.type[0]} (${ed.mult})`)
                       // ed.sourceModelName = dgName     //the DG where this ed was added.
                        hashEdPath[path] = ed
                        changesThisDg.push({msg:`Replaced ${ed.path}`,ed:ed })


                    }
                }
            }

            //now arFullDiffPath has the ordered list of all elements in the expanded diff and hashEdPath has the eds

            //now we can assemble the full diff and the start of the snapshot.
            //they start the same, but as the elements in fullDiff that are DG's are processed later, the contents are added
            //to the snapshot


            //now we can create the fullDiff
            arFullDiffPath.forEach(function (path) {

                //if we don't use a clone, then it's a reference to a common ed so if it's used more than
                //once, it won't get updated in some cases...
                let edClone = angular.copy(hashEdPath[path])

                //we always add it to the full diff. If it has been overridden, then the most recent value will be at the path
                dg.fullDiff.push(edClone)

                if (dg.name == 'BreastHistoPreviousBiopsyResult') {
                  //  console.log(path,edClone.mult)
                }


            })


            //create the override hash on the DG and remove override elements on referenced elements from the full diff
            //into the overrides note that this does not include Groups - they remain in the fullDifs and are processed
            //Changed on Aug 14 2024 as it didn't seem to work in complex cases. Rather we wait until
            //the referenced DG is being inserted and don't insert elements from the referenced DG that already exist.
            //temp aug14createDgOverride(dg)

            //now we can create the initial snapshot (override DG's will have been removed from the fullDiff)
            let arElements = []     //for the log

            dg.snapshot = []
            dg.fullDiff.forEach(function (ed) {
                arElements.push(ed)
                dg.snapshot.push(ed)        //todo does this need to be a clone
            })

            let msg = `${dg.name}: Created initial snapshot with ${arElements.length} elements`
            logger(msg,dg.name,false,arElements)

        }


        //create the hierarchy of all DGs that are parents of this one...
        function makeDgHierarchy(dg,allDg) {
            //create parental hierarchy for DG

            hashHierarchy[dg.name] = []
            //hashChildren[dg.name] = []

            let dgName = dg.name
            let arHierarchy = [dgName]
            //let arHierarchy = []

            let tmpDG = dg
            let ctr = 0

            //we only want immediate children. This is for reporting only
            if (tmpDG.parent) {
                hashChildren[tmpDG.parent] = hashChildren[tmpDG.parent] || []
                hashChildren[tmpDG.parent].push(dgName)
            }

            while (tmpDG.parent) {
                let parent = tmpDG.parent
                arHierarchy.push(parent)
                hashHierarchy[dg.name].splice(0,0,parent)
                let dgTitle = tmpDG.title

                tmpDG = allDg[tmpDG.parent]
                if (! tmpDG) {
                    throw new Error(`DG ${parent} was not found. Defined as a parent for ${dgTitle}`)
                    return
                }

                ctr++
                if (ctr > 100) {
                    throw new Error(`Error finding ultimate parent of ${dgName}`)
                    return
                }

            }
           // arHierarchy.push(dgName)

            return arHierarchy
        }

        //insert a set of ed's into the snapshot of a DG at a given path
        function insertIntoSnapshot(dg,insertPath,arElements) {
            let inx = -1
            for (const ed of dg.snapshot) {
                inx++
                if (ed.path == insertPath) {
                    break
                }
            }
            if (inx !== -1) {
                Array.prototype.splice.apply(dg.snapshot, [inx+1, 0].concat(arElements));
            } else {
                msg = `Can't find insertPath:${insertPath} in the snapshot of ${dg.name}`
                logger(msg,dg.name,true)
            }
        }

        //Once the snapshot has been completed, the overrides from the DG can be applied.
        //This can be removing elements or replacing one in the snapshot by the appropriate override



        function applyOverridesDEP(dg) {

            if (dg.overrides) {

                //use a copy of overrides so the original list remains visible in the UI
                let overrides = angular.copy(dg.overrides)


                let newSnapshot = []

                dg.snapshot.forEach(function (ed) {
                    let processedInOverride  = false  //if the ed is an override or child of an override then it will be processed in the handler. If not, then add it

                    //check all the overrides for the path.
                    //An override element will effect children if the mult is 0..0 - ie it is zeroing it out
                    for (const key of Object.keys(overrides)) {


                        if (ed.path == key) {
                            //this override directly matches an element in the snapshot
                            processedInOverride = true      //we'll process it here
                            let overrideEd = overrides[key]
                            //if it's 0..0 then drop it - otherwise add it
                            if (overrideEd.mult !== '0..0') {
                                newSnapshot.push(overrideEd)
                            }
                            break
                        } else if (ed.path.isChildPath(key)) {
                            //this is a child in the snapshot of the override. If the override has mult = 0..0
                            //then drop it. Otherwise it remains in the snapshot
                            processedInOverride = true      //we'll process it here
                            let overrideEd = overrides[key]
                            if (overrideEd.mult !== '0..0') {
                                newSnapshot.push(ed) //note that we examine the override ed, but add the actual ed
                            }
                            break
                        }


                    }

                    //if not processed by the override, then add it to the snapshot
                    if (! processedInOverride) {
                        newSnapshot.push(ed)
                    }


                })

                dg.snapshot = newSnapshot
            }
        }



        function applyOverridesORIGINAL(dg) {

            if (dg.overrides) {

                //use a copy of overrides so the original list remains visible in the UI
                let overrides = angular.copy(dg.overrides)


                let newSnapshot = []

                dg.snapshot.forEach(function (ed) {
                    let processedInOverride  = false  //if the ed is an override or child of an override then it will be processed in the handler. If not, then add it

                    for (const key of Object.keys(overrides)) {
                        if (ed.path == key || ed.path.isChildPath(key)) {
                            //this is an override or child of an override
                            processedInOverride = true      //we'll process it here

                            let overrideEd = overrides[key]
                            //if it's 0..0 then drop it - otherwise add it
                            if (overrideEd.mult !== '0..0') {
                                newSnapshot.push(overrideEd)
                            }

                            //added May15 - once an override has been processed, remove it from the list

                            //todo - not quite correct.
                            //sectionPatientDetails not working
                            //delete overrides[key]       // <<<<<<<<<

                            break

                        }
                    }

                    //if not processed by the override, then add it to the snapshot
                    if (! processedInOverride) {
                        newSnapshot.push(ed)
                    }

                    /*
                    if (dg.overrides[ed.path]){
                        //there is an override
                        let overrideEd = dg.overrides[ed.path]




                        if (canInclude) {
                        //if (overrideEd.mult !== '0..0') {
                            //if the cardinality is 0..0 just drop it. Otherwise, the override ed goes into the snapshot
                            //todo - do we need to look at element children as well here - I don't think so

                            newSnapshot.push(overrideEd)
                        }
                    } else {
                        //no override - keep in the snapshot
                        newSnapshot.push(ed)
                    }
                    */
                })

                dg.snapshot = newSnapshot
            }
        }

        //examine all the referenced dgs and import the elements from the referenced DG. We need multiple cycles
        //to allow dgs to be progressively completed. Once a DG snapshot has been completed, the overrides (includeing groups) can be applied
        function processDataGroups() {

            let moreToGo = true     //wil keep on going until all DGs have had their snapshot created done (or can't go any further)

            let ctr = 0
            while (moreToGo) {
                logger(`cycle #${ctr}`)
                ctr ++
                let updatesMade = false         //track whether we were able to fill in a DG element
                Object.keys(allDgSnapshot).forEach(function (dgName) {
                    let dg = allDgSnapshot[dgName]

                    if (! dg.snapshotComplete) {            //the snapshot is not yet complete
                        //the fullDiff is the set of diff elements created by traversing the hierarchy from ultimate parent
                        //down to the DG. Overrides to referenced dgs are removed into the dg.overrides hash (but not groups)

                        //moreRefsToInsert will be set true if we find a reference to a DG that doesn't yet have a complete snapshot.
                        // If it remains false after examining all elements in the fullDiff then
                        //it means that all DG references have been inserted into the snapshot and the DG snapshot is complete
                        //at that point the overrides can be applied.

                        specificLogger(dg.name,`Processing: cycle #${ctr}`)

                        let moreRefsToInsert = false
                        dg.fullDiff.forEach(function (ed) {
                            //the .dgToBeInserted flag is set when creating the fullDiff element to indicate that this element
                            //is a reference to a DG whose snapshot needs to be inserted

                            if (ed.dgToBeInserted) {
                                let msg1 = `Checking ${dg.name}.${ed.path} to insert ${ed.dgToBeInserted}`
                                logger(msg1,dg.name)
                                specificLogger(dg.name,msg1)
                                let insertPath = ed.path        //the path in the dg where the elements from the referenced DG are to be inserted

                                let dgToInsert = allDgSnapshot[ed.dgToBeInserted]
                                if (dgToInsert) {
                                    //does the DG to insert have a completed snapshot? (In which case it is ready to be inserted)
                                    if (dgToInsert.snapshotComplete) {
                                        //yes it does! We can add the snapshot contents at the indicated path
                                        //first, create the array to insert into the snapshot (we have to update the path)
                                        let arElements = []

                                        dgToInsert.snapshot.forEach(function (edToInsert) {
                                            let ed1 = angular.copy(edToInsert)  //as we're updating the path...
                                            let path = `${insertPath}.${edToInsert.path}`
                                            ed1.path = path

                                            //aug14 - if there's already an element at the path then don't insert
                                            //this is a change to the strategy of overriding the contents of referenced DG's
                                            //where we were removing the overrides, inserting from the referenced DG and then
                                            //replacing the elements that were overriden.
                                            let canInsert = true

                                            //this could be made more efficient with a hash - but this is simpler
                                            for (const ed2 of dg.snapshot) {  //20 aug 2020
                                                if (ed2.path == path) {
                                                    canInsert = false
                                                    specificLogger(dg.name,`Path ${path} already in insert list`)
                                                    break
                                                }
                                            }

                                            if (canInsert) {
                                                arElements.push(ed1)
                                                specificLogger(dg.name,`Adding ${path} to insert list`)
                                            }


                                            //aug 14arElements.push(ed1)



                                        })

                                        //the log entry. Include the elements that are being inserted
                                        let msg = `Inserting ${arElements.length} elements into ${dg.name}.${ed.path} from ${dgToInsert.name} (${dgToInsert.title})`
                                        logger(msg,dg.name,false,arElements)
                                        specificLogger(dg.name,`--> ${msg}`,arElements)

                                        if (dg.name == "ColorectalHistoTumour") {
                                          //  console.log(ed.path,dgToInsert.name,arElements)
                                        }


                                        //now insert the list of ed's from referenced DG into the snapshot
                                        insertIntoSnapshot(dg,insertPath,arElements)

                                        ed.dgToBeInserted = false   //mark this dg as having been inserted (false let's us know it was processed)
                                    } else {
                                        //no, the referenced DG has yet to be fully expanded.
                                        let msg = `${ed.dgToBeInserted} not yet complete at ${dg.name}.${ed.path}`
                                        logger(msg,dg.name,)
                                        moreRefsToInsert = true //we found an ed to insert, but it didn't have a completed snapshot
                                    }
                                } else {
                                    let msg = `Can't find DG ${ed.dgToBeInserted} at ${dg.name}.${ed.path}`
                                    logger(msg,dg.name,true)
                                    specificLogger(dg.name,`${msg} cycle #${ctr}`)
                                }
                            }
                        })

                        //if moreRefsToInsert is true, it means that there are reference elements in the DG to other DGs that haven't been completed yet
                        if (! moreRefsToInsert) {
                            logger(`DG: ${dg.name} has a completed snapshot !`,dg.name)
                            specificLogger(dg.name,`Snapshot complete`,dg.snapshot)
                            //todo - remove any specific elements from the diff



                            //now that the DG is complete, remove those where references have been 'zeroed out' in the diff and
                            //replace those changed in the diff
                            //we can't do that before as the full snapshot needs to be created first
                            //note that after this function has executed, overrides is cleared...
                           //overrides are not used any more - aug 20 2024  applyOverrides(dg)


                            //but there are also hierarchical Groups which may have hidden elements or overrides.
                            //these are being treated separately - but in a similar way to references

                            //create a hash of all hidden paths
                            //todo - should we be iterating over fulldiff?
                            let hashHidden = {}
                            //dg.diff.forEach(function (ed) {  //from the DG diff
                            //Anything 0..0 in the original full diff is also present in the snapshot at this point
                            //unless it's a reference
                            dg.snapshot.forEach(function (ed) {  //from the DG diff
                                if (ed.mult == '0..0') {
                                    hashHidden[ed.path] = true
                                }
                            })

                            specificLogger(dg.name,`Paths to remove`,hashHidden)


                            //create a new snapshot list that excludes 0..0 elements (and any children)
                            //also need to accomodate overrides from the main DG - eg fixing a value
                            hashReferences[dg.name] = []  ////now that we are building the definitive snapshot, we can build the references hash
                            let finalSnapshot = []

                            dg.snapshot.forEach(function (ed) {
                                let canInclude = true
                                for (const key of Object.keys(hashHidden)) {

                                    if (ed.path == key || ed.path.isChildPath(key)) {
                                        //this is an excluded or child-of excluded element so don't include it
                                        canInclude = false
                                        let msg = `Directly removed ${ed.path}`
                                        logger(msg,dg.name,)
                                        break
                                    }
                                }

                                if (canInclude) {
                                    let type = ed.type[0]
                                    if (fhirDataTypes.indexOf(type) == -1) {
                                        hashReferences[dg.name].push({path:ed.path,dgName: type,ed:ed})
                                    }

                                    finalSnapshot.push(ed)
                                }
                            })

                            //now that we have the 'final' snapshot we remove all elements that don't have a parent.
                            //this can occur when the DG has a 'floating' element - likely caused by previous bugs that left eds in the diff

                            let hash = {}
                            dg.snapshot=[]
                            finalSnapshot.forEach(function (ed) {
                                hash[ed.path] = true
                            })

                            finalSnapshot.forEach(function (ed) {
                                let path = ed.path
                                let ar = path.split('.')
                                if (ar.length > 1) {
                                    ar.pop()
                                    let parentPath = ar.join('.')
                                    if (hash[parentPath]) {
                                        dg.snapshot.push(ed)
                                    } else {
                                        specificLogger(dg.name,`${path} removed as has no parent`)
                                    }
                                } else {
                                    dg.snapshot.push(ed)
                                }
                            })


                            //dg.snapshot = finalSnapshot

                            //adjust EnableWhen elements
                            adjustEnableWhen(dg)

                            //adjustFhirResource(dg)      //sets the FHIR resource to extract to


                            //ensure that the children of groups are contiguous
                            adjustGroupOrdering(dg)

                            //where there is a fixed order set (dg.ssOrderP
                            setFixedOrder(dg)

                            //look for business related issues - eg a ValueSet and options - in the dg. Doesn't alter the DG.
                            auditDG(dg)

                            logger(`DG: ${dg.name} snapshot has been finalised`,dg.name)
                            dg.snapshotComplete = true
                        } else {
                            logger(`DG: ${dg.name} not yet completed`,dg.name)
                        }
                    }
                })


                //just to terminate the loop. todo need to check that all DG's have a completed snapshot
                if (ctr > 100) {
                    moreToGo = false
                }

            }
        }



        //Adjust the conditionals when they are either inherited or referenced from anoth DG
        function adjustEnableWhen(dg) {

            return //Feb5- debugging

            let printLog = false
            if (dg.name == 'BreastHistoClinicalInformationXX') {printLog = true}

            for (const ed of dg.snapshot) {
                if (ed.enableWhen) {
                    for (const ew of ed.enableWhen) {

                        //ew.source format is [dgName].seg1.seg2...

                        //this checks that the first path of the source / controller path is the same as the dg
                        if (printLog) {
                            console.log(`Target:${ed.path}  Source/Control:${ew.source}`)
                        }

                        let arControllerPath = ew.source.split('.')  //the control element - question / source
                        if (arControllerPath[0] !== dg.name) {
                            //This is either from an inherited DG or a referenced one.
                            //the adjustment is different for a referenced vs an inherited one
                            //if it's a child, then removing the first segment should have a valid element
                            arControllerPath.splice(0,1) //remove the dg name
                            let testElementPath = arControllerPath.join('.')
                            if (printLog) {
                                console.log(`testElementPath: ${testElementPath}`)
                            }

                            //see if there are any paths in the DG that match this element (they won't have the dg name as a prefix)
                            let ar1 = dg.snapshot.filter(el => el.path == testElementPath)

                            if (ar1.length > 0) {
                                //yes, this is a child - or at least there is a matching element
                                if (printLog) {
                                    console.log(`found in DG`)
                                }
                                ew.source = `${dg.name}.${testElementPath}`
                            } else {

                                if (printLog) {
                                    console.log(`NOT found in DG`)
                                }







                                //no, this must be a referenced DG
                                //so we need to adjust the ew.source path.
                                //We've already removed the original DG name from arController (above)
                                //so we need to prefix that with the path to this element to give the adjusted path
                                //eg {path.to.here}.{path.in.source

                                //new code 20Jan

                                let arThisPath = ed.path.split('.')      // this ed - the one that is dependent


                             //   arThisPath.pop()        //remove the last element (as it specifies this element)
                             //   arThisPath.splice(0,0,dg.name)      //add the DG name at the front
                              //  let newPath = arThisPath.concat(arControllerPath) //stick the source path on the end
                               // ew.source = newPath.join('.')   //and assign to the source

                                let ar = arControllerPath.slice(1) //removes the dgname from the source


                                arThisPath.splice(0,0,dg.name)  //This is the source with the DG name removed






                                let arFullPath = arThisPath.concat(ar) //start from the insert point
                                ew.source = arFullPath.join('.')


                            }



                            if (printLog) {
                                console.log(`Final: source from ew: ${ew.source}  current path: ${ed.path}`)
                            }




                        } else {
                            if (printLog) {
                                console.log(`Defined in this DG (first segment matches)`)
                            }
                        }



                    }

                }
            }


        }

        function adjustGroupOrdering(dg) {
            //ensure that the 'children' of group elements are immediately after the 'parent'. The tree is OK, but the lists are wrong...
            //NOTE: assume only a single level of group elements
            //first create a new diff list that excludes group children
            let hash = {}       //will have all the group children
            let lst = []        //will be the new diff
            for (const ed of dg.snapshot) {

                let ar = ed.path.split('.')
                if (ar.length == 1) {
                    //this is an 'ordinary' element
                    lst.push(ed)
                } else {
                    //this could be a group child todo need to check that the DT is a group??
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



            dg.snapshot = lst

        }





        //loook for non-error issues with a DG
        function auditDG(dg) {
            let hashEd = {}     //has by path
            for (const ed of dg.snapshot) {
                hashEd[ed.path] = ed
                //eds with both valueSet and options
                if (ed.valueSet && (ed.options && ed.options.length > 0)) {
                    let msg1 = `ERROR: Element ${ed.path} has both a ValueSet and options`
                    logger(msg1,dg.name,"vs and options")
                    ed.issue = ed.issue || []
                    ed.issue.push('vs and options')
                }
            }
            //elements with no parent

            for (const ed of dg.snapshot) {
                let ar = ed.path.split('.')
                if (ar.length > 1) {
                    ar.pop()
                    let parent = ar.join('.')
                    if (! hashEd[parent]) {
                        let msg1 = `ERROR: Element ${ed.path} is missing their parent ${parent} in the DG`
                        ed.issue = ed.issue || []
                        ed.issue.push('missingParent')
                        logger(msg1,dg.name,"missing parent")
                    }
                }
            }


        }

        function setFixedOrder(dg) {

            if (dg.ssOrder) {
                //make a hash by path of the current ss
                //console.log(`Setting fixed path for ${dg.name}`)
                logger(`Setting fixed path`,dg.name)
                let hash = {}
                dg.snapshot.forEach(function (ed) {
                    hash[ed.path] = ed
                })

                //iterate over the ssOrder element, deleting from the hash as they are added
                let newSnapshot = []
                //newSnapshot.push(dg.snapshot[0])    //the root
                dg.ssOrder.forEach(function (path,inx) {
                    if (inx > 0) {
                        let ed = hash[path]
                        if (ed) {
                            newSnapshot.push(ed)
                            delete hash[path]
                        } else {
                            //THis occurs when there is something in ssOrder that is
                            //not in the DG. todo - do need to look into this as part of ordering
                            //console.warn(`${dg.name}: path ${path} not found`)
                            logger(`path ${path} not found (TBI)`,dg.name)
                        }
                    }
                })

                //append any left over
                Object.keys(hash).forEach(function (key) {
                    newSnapshot.push(hash[key])

                })

                dg.snapshot = newSnapshot
            }

        }

        //remove cruft (eg empty arrays) from snapshot
        function cleanSnapshot(dg) {
            let elementsToRemove = ['otherAllowed','sourceModelName','sourceReference','rules','slicedFrom','definedOnDG','slicedFrom','originalType','insertAfter']
            let newSS = []

            for (const ed of dg.snapshot) {
                let newEd = {}
                for (const key of Object.keys(ed)) {
                    let canAdd = true
                    let element = ed[key]

                    if (elementsToRemove.indexOf(key) > -1) {
                        canAdd = false
                    }

                    //empty strings
                    if (typeof element === "string" && element === "") {
                        canAdd = false
                    }

                    //boolean false values
                    if (typeof element === "boolean" && element === false) {
                        canAdd = false
                    }

                    //empty arrays
                    if (Array.isArray(element) && element.length == 0) {
                        canAdd = false
                    }

                    if (canAdd) {
                        newEd[key] = ed[key]
                    }

                }
                newSS.push(newEd)
            }
            dg.snapshot = newSS

        }


        function updateTypes(dg) {
            let fhirDT = utilsSvc.fhirDataTypes()
            for (const ed of dg.diff) {
                if (ed.type && ed.type.length > 0) {
                    let type = ed.type[0]
                    if (fhirDT.indexOf(type) == -1) {
                        ed.type = ['Group']
                    }
                }
            }
        }

        return {

            leafDGs : function () {
                //dg's that are leaf nodes
                //create a list of all DG's that are referred to as a parent
                let hashAllParents = {}
                for (const key of Object.keys(allDgSnapshot)) {
                    let dg = allDgSnapshot[key]
                    if (dg.parent) {
                        hashAllParents[dg.parent] = hashAllParents[dg.parent] || []
                        hashAllParents[dg.parent].push(dg.name)     //this DG refers to that parent

                    }
                }
                //now get the list of DG's never referred to as a parent
                let leafDG = []
                for (const key of Object.keys(allDgSnapshot)) {
                    let dg = allDgSnapshot[key]
                    if (! hashAllParents[dg.name]) {
                        let item = {name:dg.name}
                        leafDG.push(item)
                    }
                }

                return leafDG

            },

            diffAnalysis : function (hashAllDG) {
                //what diffs do - specifically diffs that are zeroing out something...
                let arSummary = []
                for (const key of Object.keys(hashAllDG)) {
                    let dg = hashAllDG[key]
                    let summary = {name:dg.name,cnt:0,zero:0}
                    if (dg.diff) {
                        for (const ed of dg.diff) {
                            summary.cnt++
                            if (ed.mult && ed.mult == '0..0') {
                                summary.zero++
                            }

                        }
                        arSummary.push(summary)
                    }
                }
                arSummary.sort(function (a,b) {
                    if (a.name > b.name) {
                        return 1
                    } else {
                        return -1
                    }
                })
                return arSummary
            },

            dgContainedBy : function (dgName) {
                //DG's that contain this one




                //first, get all descendants of this DG
                let descendants = findAllDescendants(dgName)


               // return descendants




                //now, find all DGs that contain any of these
                //we'll keep on using the descendants array for convenience

                let ar = []
                for (const key of Object.keys(allDgSnapshot)) {
                    if (descendants.indexOf(key) == -1) {
                        //This dg is not a descendant
                        let dg = allDgSnapshot[key]

                        for (const ed of dg.snapshot) {
                            let type = ed.type[0]
                            if (descendants.indexOf(type) > -1) {
                                //this type is one of the descendants
                                if (descendants.indexOf(key) == -1) {   //it's not already in the list, add it
                                    descendants.push(key)
                                }
                                break
                            }

                        }

                    }


                }
                descendants.sort()

                return descendants


                function findAllDescendants(dgName) {

                    let descendants = [dgName];
                    let stack = [dgName];

                    while (stack.length > 0) {
                        let currentName = stack.pop();
                        for (const key of Object.keys(allDgSnapshot)) {
                            let dg = allDgSnapshot[key]

                            if (dg.parent  && dg.parent === currentName) {
                                descendants.push(dg.name);
                                stack.push(dg.name); // Add to stack to explore its children
                            }
                        }
                    }

                    return descendants;
                }



            },

            dgUseSummary : function () {
                //an analysis of where dgs are contained by another. Uses the snapshot
                let hashUsage = {}
                let hashName = {}
                let fhirDT = utilsSvc.fhirDataTypes()
                for (const key of Object.keys(allDgSnapshot)) {
                    let dg = allDgSnapshot[key]
                    hashName[key] = {title:dg.title}
                    for (const ed of dg.snapshot) {
                        let type = ed.type[0]
                        if (fhirDT.indexOf(type) == -1) {   //not a FHIR DT
                            hashUsage[type] = hashUsage[type] || {cnt:0,names:{}}
                            hashUsage[type].cnt++

                            hashUsage[type].names[key] = hashUsage[type].names[key] || 0
                            hashUsage[type].names[key] ++
                        }
                    }
                }


                let arUsage = []
                for (const key of Object.keys(hashUsage)) {
                    let title = key
                    if (hashName[key]) {
                        title = hashName[key].title
                    }
                    arUsage.push({name:key,title:title,cnt:hashUsage[key].cnt,names:hashUsage[key].names})
                }

                arUsage.sort(function (a,b) {
                    if (a.cnt > b.cnt) {
                        return -1
                    } else {
                        return 1
                    }

                })

                return arUsage

            },
            cleanDG : function(dg) {
                return  cleanSnapshot(dg)   //remove 'empty' attributes
            },
            getFrozenComp : function (comp,allElements) {
                //construct a model that represents a composition - but similar to a DG
                //effecively an expanded DG

                let dg = {kind:'dg',name:comp.name,title:comp.title,diff:[],snapshot:[]}


                for (const thing of allElements) {
                  // if (thing.ed.type) {
                    //The snapshot generator barfs if there isn't a type...
                    thing.ed.type = thing.ed.type || 'Group'
                    thing.ed.mult = thing.ed.mult || '0..1'
                    dg.snapshot.push(thing.ed)
                  //  }


                }

                cleanSnapshot(dg)   //remove 'empty' attributes
                dg.diff = dg.snapshot

                //now replace all the non-FHIR DTs with 'Group'
                updateTypes(dg)
                delete dg.snapshot
                return dg


            },
            getFrozenDG : function (dgName) {
                //create a version of the dg where the diff is replaced by the snapshot.
                //used for the playground ATM
                let that = this

                let dg = angular.copy(allDgSnapshot[dgName])
                dg.type = that.getExtractResource(dgName)       //the resource this DG extracts to, if any

                cleanSnapshot(dg)   //remove 'empty' attributes
                delete dg.parent

                //copy from the snapshot to the diff.
                //the path in a diff doesn't have the leading dg name.
                dg.diff = []
                for (let i=0;i < dg.snapshot.length; i++) {
                    let ed = dg.snapshot[i]
                    dg.diff.push(ed)
                }

                //now replace all the non-FHIR DTs with 'Group'
                updateTypes(dg)

                delete dg.fullDiff
                delete dg.snapshot
                delete dg.ssOrder       //not needed in a component (it was commented out - why??)
                return dg

            },
            getImpactedDGsDEP : function (dgName) {
                //get all DG's that could be impacted by changes in this DG
                //
                let impactedDG = {}
                let fhirTypes = utilsSvc.fhirDataTypes()    //the FHIR datatypes - can't be references

                let arDGNames = [dgName]    //todo - add all children
                //will be effected if a DG references one of these
                //note that a specific change may not have an impact - if the DG has overitten an inherited path then it wont change

                Object.keys(allDgSnapshot).forEach(function (key) {

                    let dg = allDgSnapshot[key]
                    if (dg.diff) {
                        //examine the diff rather than the snapshot
                        for (const ed of dg.diff) {
                            let type = ed.type[0]
                            if (fhirTypes.indexOf(type) == -1) {
                                //not a FHIR datatype
                                if (arDGNames.indexOf(type) > -1) {
                                    //this ed refers to the input DG - or one of its children
                                    impactedDG[dg.name] = true
                                    break
                                }
                            }


                        }
                    }

                })

               // console.log(impactedDG)
                return impactedDG

            },
            getNamedQueries : function (dgName) {
                //get all the named queries used by any member of this DG

                let allNamedQueries = {}    //all of the named queries used
                let fhirDT = utilsSvc.fhirDataTypes()

                let dg = allDgSnapshot[dgName]
                if (!dg) {
                    console.error(`${dgName} not a valid DG`)
                    return []
                }

                addNQ(dg,{path:dg.name})       //any named queries on this DG

                dg.snapshot.forEach(function (ed) {
                    let type = ed.type[0]
                    if (fhirDT.indexOf(type) == -1) {
                        //this is a DG
                        let refDG = allDgSnapshot[type]
                        addNQ(refDG,ed)
                    }
                })

                function addNQ(dg,ed) {
                    if (!dg){return}

                    let testDG = dg
                    while (testDG) {
                        if (testDG.namedQueries) {
                            testDG.namedQueries.forEach(function (name) {
                                let fullNQ = utilsSvc.getNQbyName(name)

                                allNamedQueries[name] = allNamedQueries[name] || {itemName:fullNQ.itemName,name:name,paths:[]}
                                allNamedQueries[name].paths.push({path:ed.path})

                                //allNamedQueries[name] = tmp

                            })
                            break
                        } else {
                            testDG =  allDgSnapshot[testDG.parent]
                        }
                    }

                }
               // console.log(allNamedQueries)

                let lst = []
                for (const key of Object.keys(allNamedQueries) ) {
                    let tmp = allNamedQueries[key]


                    lst.push(tmp)
                }
                //console.log(lst)
                return lst

            },
            getExtractableDG : function (dgName) {
                //get all the referenced DG's within this one that are extracted into a resource
                let that = this
                let arReferences = []
                let fhirDT = utilsSvc.fhirDataTypes()

                let dg = allDgSnapshot[dgName]
                let allEd = dg.snapshot

                allEd.forEach(function (ed) {

                    let type = ed.type[0]
                    if (fhirDT.indexOf(type) == -1) {
                        //console.log('---> ',ed.path,type)

                        //this is LIM DT - is it extractable?
                        let extractResource = that.getExtractResource(type)
                        let fullPath = `${dgName}.${ed.path}`
                        let item = {path:fullPath,dgName:type,fhirType:extractResource}
                        //console.log(item)
                        arReferences.push(item)

                        //   getExtractResource
                    }
                })
                return arReferences

            },
            getExtractResource : function (dgName) {
                //retrieves the FHIR resource to extract to following the inheritance chain
                let dg = allDgSnapshot[dgName]
                if (dg) {
                    if (dg.type) {
                        return dg.type
                    } else {
                        if (dg.parent)  {      //only if there's no type set and there is a parent...
                            let parentDG = allDgSnapshot[dg.parent]
                            while (parentDG) {
                                if (parentDG.type) {
                                    return parentDG.type
                                    break
                                } else {
                                    if (parentDG.parent) {
                                        let parentName = parentDG.parent
                                        parentDG = allDgSnapshot[parentName]
                                    } else {

                                        break
                                    }
                                }
                            }
                        }
                    }

                }
            },
            getVariables : function (dgName) {
                //get all the SDC variables used by a single model

                let dg = allDgSnapshot[dgName]
                let arVariables = []
                if (dg ) {
                    getVariable(dg)
                    if (dg && dg.snapshot) {
                        for (ed of dg.snapshot) {
                            getVariable(ed)
                        } 
                    }

                }
                return arVariables

                function getVariable(el) {
                    if (el.adHocExtension) {
                        for (const ext of el.adHocExtension) {
                            if (ext.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId") {


                                arVariables.push({url:ext.url,path:el.path,expression:{expression:ext.valueString},ext:ext})
                            } else if (ext.valueExpression ) {
                                let variable = ext.valueExpression
                                if (variable) {
                                    arVariables.push({url:ext.url,path:el.path,expression:variable,ext:ext})
                                }
                            } else if (ext.extension) {
                                for (const child of ext.extension) {
                                    if (child.valueExpression ) {
                                        let variable = child.valueExpression
                                        if (variable) {
                                            arVariables.push({url:ext.url,path:el.path,expression:variable,ext:ext})
                                        }
                                    }
                                }
                            }

                        }
                    }
                }



            },
            getAllAdHocExt : function () {
                //create an object containing all adHoc extensions on all DGs
                let arAdHoc = []
                for (const key of Object.keys(allDgSnapshot)) {
                    const dg = allDgSnapshot[key]
                    if (dg.adHocExtension) {
                        //arAdHoc.push(...dg.adHocExtension)
                        arAdHoc.push({dg:key,path:key,adHocExt: dg.adHocExtension})
                    }
                    for (const ed of dg.snapshot) {
                        if (ed.adHocExtension) {
                            //arAdHoc.push(...ed.adHocExtension)
                            arAdHoc.push({dg:key,path:ed.path,adHocExt: ed.adHocExtension})
                        }
                    }
                }

                arAdHoc.sort(function (a,b) {
                    if (a.dg > b.dg) {
                        return 1
                    } else {
                        return -1
                    }
                })

                return arAdHoc

                function adHocObjDEP(json) {
                    let obj = {msg:"Invalid Json",json:json}
                    try {
                        obj = angular.fromJson(json)
                    } catch (ex) {

                    }
                    return obj
                }

            },
            getAdHocExt : function (dgName) {
                //retrieves any adhoc extensions defined to following the inheritance chain
                //note - only gets adHoc defined on DG - not elements
                let dg = allDgSnapshot[dgName]
                if (dg) {
                    if (dg.adHocExt) {
                        return dg.adHocExt
                    } else {
                        if (dg.parent)  {      //only if there's no type set and there is a parent...
                            let parentDG = allDgSnapshot[dg.parent]
                            while (parentDG) {
                                if (parentDG.adHocExt) {
                                    return parentDG.adHocExt
                                    break
                                } else {
                                    if (parentDG.parent) {
                                        let parentName = parentDG.parent
                                        parentDG = allDgSnapshot[parentName]
                                    } else {

                                        break
                                    }
                                }
                            }
                        }
                    }

                }
            },
            getFixedValues : function (dgName) {
                //retrieves the extract fixed values following the inheritance chain
                let dg = allDgSnapshot[dgName]
                if (dg) {
                    if (dg.fixedValues && dg.fixedValues.length > 0) {
                        return dg.fixedValues
                    } else {
                        if (dg.parent)  {      //only if there's no type set and there is a parent...
                            let parentDG = allDgSnapshot[dg.parent]
                            while (parentDG) {
                                if (parentDG.fixedValues) {
                                    return parentDG.fixedValues
                                    break
                                } else {
                                    if (parentDG.parent) {
                                        let parentName = parentDG.parent
                                        parentDG = allDgSnapshot[parentName]
                                    } else {

                                        break
                                    }
                                }
                            }
                        }
                    }

                }
            },
            makeSnapshots: function (hashAllDG,inFocusDGName) {
                clearInternalCaches()

                focusDGName = inFocusDGName     //a specific DG to log activity
                specificLogger(focusDGName,`Detailed logging for ${focusDGName} enabled`)

                logToConsole = false

                allDgSnapshot = angular.copy(hashAllDG) //this will be a local clone

                //April14 2025 - somehow the clone is getting saved - this interferes with the snapshot generation
                for (let key of Object.keys(allDgSnapshot)) {
                    delete allDgSnapshot[key].snapshotComplete
                }

                try {
                    //construct a complete diff for each dg including the hierarchy
                    Object.keys(allDgSnapshot).forEach(function (dgName) {
                        let dg = allDgSnapshot[dgName]
                        makeFullDiff(dg, allDgSnapshot)

                    })

                    //perform the 'inflation' of DG's that results in the snapshot
                    processDataGroups()


                    console.log(`Size of SnapShots: ${utilsSvc.getSizeOfObject(allDgSnapshot)/1024} K`)

                    //construct an alphabetical list of DGs for the UI
                    Object.keys(allDgSnapshot).forEach(function (dgName) {
                        lstAllDG.push(allDgSnapshot[dgName])
                        lstAllDGTitle.push(allDgSnapshot[dgName])
                    })

                    lstAllDG.sort(function (a,b) {
                        if (a.name > b.name) {
                            return 1
                        } else {
                            return -1
                        }
                    })

                    lstAllDGTitle.sort(function (a,b) {
                        if (a.title > b.title) {
                            return 1
                        } else {
                            return -1
                        }
                    })


                } catch (ex) {
                    console.log(ex)
                    alert(`There was an exception during Snapshot generation processing. You should revert your latest update. ${angular.toJson(ex.message)}`)
                }

                return {log:log}

            },
            getAllDg : function () {
                //return the hash of all DGs with snapshots
                return allDgSnapshot
            },

            addOrderToAllDGDEP : function () {
                let testHash = {}
                Object.keys(allDgSnapshot).forEach(function (key) {
                    let dg = angular.copy(allDgSnapshot[key])
                    dg.pinOrder = []
                    dg.snapshot.forEach(function (ed) {
                        dg.pinOrder.push(ed.path)

                    })
                    delete dg.snapshot
                    testHash[key] = dg
                })
                return testHash
            },


            getDGList : function () {
                //return an alphabetical list of DG by name
                return lstAllDG
            },
            getDGListTitle : function () {
                //return an alphabetical list of DG by title
                return lstAllDGTitle
            },
            getDG: function (dgName) {
                return allDgSnapshot[dgName]
            },
            getHierarchy : function (dgName) {
                return hashHierarchy[dgName]
            },
            getReferences : function (dgName) {
                return hashReferences[dgName]
            },
            getChangeHistory : function (dgName) {
                return hashHistory[dgName]
            },
            getRelationshipsSummary : function (dgName) {
                //summarizes the parents, direct children & references
                let summary = {}
                summary.parents = hashHierarchy[dgName]
                summary.references = hashReferences[dgName]
                summary.children = hashChildren[dgName]

                return summary
            },
            getFullListOfElements: function (dgName,dgRef) {
                //return the full list of elements for a DG. In the format of the existing full element list.
                let lst = []
                let hash = {}
                //if dgRef was passed in, then decorate the ones that were defined on the DG (not a parent).
                //used for the tree to show locally updated elements
                if (dgRef && dgRef.diff) {
                    dgRef.diff.forEach(function (ed) {
                        hash[ed.path] = true
                    })
                }


                let title = dgName
                let dg = allDgSnapshot[dgName]
                if (dg) {       //not sure what to do if null - shouldn;t happen!
                    title = dg.title
                } else {
                    console.error(`No DG called ${dgName} found`)
                    //should be obvious where there's nothing there...
                    //alert(`No DG called ${dgName} found`)
                    return []
                }


                let root = {path:dgName,title:title,kind:"root"}
                lst.push({ed:root})
                if (allDgSnapshot[dgName] && allDgSnapshot[dgName].snapshot) {
                    allDgSnapshot[dgName].snapshot.forEach(function(ed) {
                        let clone = angular.copy(ed)
                        if (hash[ed.path]) {
                            clone.definedOnDG = true
                        }
                        clone.path = `${dgName}.${clone.path}`
                        lst.push({ed:clone})
                    })
                } else {
                    console.error(`No DG called ${dgName} found`)
                    //alert(`No DG called ${dgName} found`)
                }




                //++++++++= temp Feb 27 error with re-order
                return lst

                //this is supposed to ensure that the order always has parents before children... - but it barfs if there are missing parents...
            //    let lst1 = utilsSvc.reorder(lst)

               //     return lst1

            }
        }

    })