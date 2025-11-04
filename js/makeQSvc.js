//This is the current service to make Q

angular.module("pocApp")

    .service('makeQSvc', function($http,codedOptionsSvc,QutilitiesSvc,snapshotSvc,$filter,vsSvc,
                                  utilsSvc,makeQHelperSvc) {





        let unknownCodeSystem = "http://example.com/fhir/CodeSystem/example"
        let extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"

        extensionUrls = makeQHelperSvc.getExtensionUrls()  //{}

       // extensionUrls.displayCategory = "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory"

        extInitialExpressionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        extItemControlUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extCollapsibleUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible"

        //extQuantityUnit = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
        extQuantityUnit = "http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption"

        //extPlaceHolderUrl = "http://hl7.org/fhir/StructureDefinition/entryFormat"

        //extensions for definition extraction
        extAllocateIdUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
        extDefinitionExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
        //Nov2 extExtractionValue = "http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue"
        extDefinitionExtractValue = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue"

        extObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"

        extHTMLRender = "http://hl7.org/fhir/StructureDefinition/rendering-xhtml"

        //extOb


      //  extExtractionContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext"
        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"

        //this specifies a specific value or an expression to set the value


        //defines a query that provides context data for pre-population of child elements
        extPopulationContext = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext"
        extVariable = "http://hl7.org/fhir/StructureDefinition/variable"

        //let extGtableUrl = ""
       // let extSourceQuery = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries"
        systemItemControl = "http://hl7.org/fhir/questionnaire-item-control"

        extCalculatedExpression = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression"

        extOriginalPath = "http://canshare.co.nz/fhir/StructureDefinition/original-path"


        //resources that have the patient reference attached.
        //The actual reference is to a variable with the name 'PatientID'
        //todo - might want to externalize into a config file ot similar

        //todo connectathon - this interferes when the patient is not in the bundle
        //does seem to be overriten if the DG specified it though - is this OK?
        let resourcesForPatientReference = {}
        resourcesForPatientReference['AllergyIntolerance'] = {path:'patient'}
        resourcesForPatientReference['Observation'] = {path:'subject'}
        resourcesForPatientReference['Condition'] = {path:'subject'}
        resourcesForPatientReference['MedicationStatement'] = {path:'subject'}
        resourcesForPatientReference['Specimen'] = {path:'subject'}
        resourcesForPatientReference['ServiceRequest'] = {path:'subject'}
        resourcesForPatientReference['Procedure'] = {path:'subject'}
        resourcesForPatientReference['Task'] = {path:'for'}
        //resourcesForPatientReference['Patient'] = {}   //treated as a special case




        function addPrePopExtensions(Q) {
            //add the SDC extensions required for pre-pop
            //these are added to the
            Q.extension = Q.extension || []
            addExtension("patient","Patient","The patient that is to be used to pre-populate the form")
            addExtension("user","Practitioner","The practitioner that is to be used to pre-populate the form")
           // addExtension("encounter","Encounter","The current encounter")


            //let ext = {url:extSourceQuery,valueReference:{reference:"#PrePopQuery"}}

            function addExtension(name,type,description) {
                let ext = {url:extLaunchContextUrl,extension:[]}

                ext.extension.push({url:'name',valueCoding:{code:name}})
                ext.extension.push({url:'type',valueCode:type})
                ext.extension.push({url:'description',valueString:description})
                Q.extension.push(ext)
            }
        }


        function addItemControl(item,code) {
            let ext = {url:extItemControlUrl}

            let cc = {coding:[{code: code,system:'http://hl7.org/fhir/questionnaire-item-control'}]}
            ext.valueCodeableConcept = cc
            item.extension = item.extension || []
            item.extension.push(ext)
        }




        function addUnits(item,ed) {
            if (ed.units && ed.units.length > 0) {

                ed.units.forEach(function (unit) {
                    item.extension = item.extension || []
                    item.extension.push({url:extQuantityUnit,valueCoding:{code:unit,system:'http://unitsofmeasure.org'}})

                })


            }
        }


        function addItemControl(item,code) {
            let ext = {url:extItemControlUrl}
            ext.valueCodeableConcept = {
                coding: [{
                    code: code,
                    system: systemItemControl
                }]
            }

            item.extension = item.extension || []
            item.extension.push(ext)
        }


        function addDefinitionExtract(item,vo) {
            //add a definition extract resource. vo = {definition: fullUrl: } - might add others later
            //
            let ext = {url:extDefinitionExtract,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:vo.definition})       //the canonical url of the resource to extract - must be present
            if (vo.fullUrl) {
                ext.extension.push({url:"fullUrl",valueString:`%${vo.fullUrl}`})
            }

            if (vo.ifNoneExist) {
                ext.extension.push({url:"ifNoneMatch",valueString:vo.ifNoneExist})
            }

        //    file:///Users/davidhay/clinFHIR/canshare-poc1/cs-UI-request-lab1/js/makeQCtrlDEP.js
            item.extension = item.extension || []
            item.extension.push(ext)
        }

        function addFixedValue(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression
            //definition is the path in the resource (added to the 'item.definition' value


            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extDefinitionExtractValue,extension:[]}
            ext.extension.push({url:"definition",valueUri:definition})

            if (value) {
               // console.log(value)
                let child = {url:'fixed-value'}
                child[`value${type}`] = value

                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child.valueExpression = {language:"text/fhirpath",expression:expression}
                //child[`value${type}`] = expression
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }


        function setExtractionContextDEP(item,context) {
            //set the extraction context using the context (resource SD)

            item.extension = item.extension || []

            let ext = {url:extDefinitionExtract,extension:[]}
            ext.extension.push({url:'definition',valueCanonical: context})

            //item.extension.push({url:extExtractionContextUrl,valueCanonical:extractionContext})
            item.extension.push(ext)
        }

        function addReferenceDEP(item,definition,type,expression) {
            //add a fixed value extension. Can either be a value or an expression

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extDefinitionExtractValue,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:definition})


            let child = {url:'expression'}
            child[`valueExpression`] = {language:"text/fhirpath",expression:expression}
            ext.extension.push(child)


            item.extension = item.extension || []
            item.extension.push(ext)

        }



        function addUseContext(Q) {
            //adds the use context for the FHIRPath Lab. Need to configure this in some way
            Q.useContext = Q.useContext || []
            let uc = {code:{system:"http://terminology.hl7.org/CodeSystem/usage-context-type",code:"user",display:"User Type"}}
            uc.valueCodeableConcept = {coding:[{code:'extract',display:'Demo Extract'}]}
            Q.useContext.push(uc)
        }

        function addPublisher(Q) {
            Q.publisher = "David Hay"
        }

        //adds the named queries for a DG as variable extensions
        //nq = {name: description: content: }
        function addNamedQuery (item,name,namedQueries) {

            let nq = namedQueries[name]
            if (! nq) {

                console.error(`Named Query: ${name} not found when building Q`)

                //todo - should there ba an error message or log?
                return
            }

            let ext = {url:extVariable}

            //ext.valueExpression = {language:"application/x-fhir-query",expression:nq.contents,name:nq.name}
            ext.valueExpression = {language:"application/x-fhir-query",expression:nq.contents,name:nq.itemName}

            item.extension = item.extension || []
            item.extension.push(ext)

        }

        //Population context is used as a bridge between a named query (a variable in the Q)
        //and how it can be pre-populated
        function addPopulationContext (nqName,item) {

            let nq = utilsSvc.getNQbyName(nqName)
            if (!nq) {
                alert(`Named Query: ${nqName} not found`)
                return
            }

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extPopulationContext}


            ext.valueExpression = {language:"text/fhirpath"}
            ext.valueExpression.name = nq.itemName //the name that subsequent expressions will use
            ext.valueExpression.expression = `%${nq.name}.entry.resource` //the 'iterator'

            item.extension = item.extension || []
            item.extension.push(ext)

        }


        function addAdHocExtension(Q,item,adHocExtension) {
            if (adHocExtension) {
                item.extension = item.extension || []
                adHocExtension.forEach(function (ext) {
                    if (ext.url == extVariable && ext.valueExpression
                        && ext.valueExpression.language && ext.valueExpression.language.indexOf('-query') > -1)  {
                            //if something is an x-qurey variable, it goes on the Q
                        Q.extension = Q.extension || []
                        Q.extension.push(ext)

                    } else {
                        item.extension.push(ext)
                    }



                })
            }

        }

        //If an adhoc extension has been added (to DG or ED) then add the extension to the item
        function addAdHocExt(item,adHocExt) {
            if (adHocExt) {
                try {
                    let json = angular.fromJson(adHocExt)
                    item.extension = item.extension || []
                    json.forEach(function (ext) {
                        item.extension.push(ext)
                    })
                } catch (ex) {
                    console.error(adHocExt)
                    console.error(ex)
                }
            }
        }

        //add fixed values to the item
        function addFixedValues(item,dg) {


            let lstFV = snapshotSvc.getFixedValues(dg.name)

            if (lstFV && lstFV.length > 0) {
                for (const fv of lstFV) {
                    //todo - need to support other types
                    //the the resource type - first segment in path is trtpe
                    let ar = fv.path.split('.')
                    let resourceType = ar[0]

                    let path = `http://hl7.org/fhir/StructureDefinition/${resourceType}#${fv.path}`


                    addFixedValue(item,path,fv.type,fv.value)
                }
            }
        }

        //get the extraction context from the DG
        function getExtractionContext(dgName,hashAllDG) {
            let dg = hashAllDG[dgName]
            let extractionContext


            extractionContext = snapshotSvc.getExtractResource(dgName)


            //is this a profile or a core resource type
            if (extractionContext && extractionContext.indexOf('http') == -1) {
                //this is a core FHIR patient resource. Add the rest of the url
                extractionContext = `http://hl7.org/fhir/StructureDefinition/${extractionContext}`
            }

            return extractionContext
        }



        //If the ed has the 'otherType set, then an additional item mutst be created - possibl with an enableWhen
        //The function returns the items to insert (including the source) - possibly not needed, but I'll leave it like this for now
        function addOtherItem(ed,sourceItem) {
            
           // return //temp feb 25
            

            let newItem       //the function returns the list of items
            switch (ed.otherType) {
                case "never" :
                    //just add the extra item
                   // let item = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string'}
                   // arItems.push(sourceItem)
                   // arItems.push(item)
                    break
                case "sometimes" :
                    //add the additional item, plus a conditional on the sourceItem
                    let id =  utilsSvc.getUUID()
                    newItem = {text:`Other ${ed.title}`,linkId:`${ed.path}-other`,type:'string',prefix: id}

                    let qEW = {}
                    qEW.question = sourceItem.prefix //  id //sourceItem.linkId
                    qEW.operator = '='
                    qEW.answerCoding = {code:"74964007",system:'http://snomed.info/sct',display:"Other"}

                    //If the original had definition set (ie where the element is extracted to) then add it to the new element as well
                    newItem.definition = sourceItem.definition

                    newItem.enableWhen = []
                    if (sourceItem.enableWhen) {
                        for (const ew of sourceItem.enableWhen ) {
                            newItem.enableWhen.push(ew)
                        }
                    }



                   // newItem.enableWhen = sourceItem.enableWhen || []


                    newItem.enableWhen.push(qEW)
                    //if there is more thanone ew, then need to set the enableBehaviour
                    if (newItem.enableWhen.length > 1) {
                        newItem.enableBehavior = 'any'    //todo - may need to specify this
                    }


                    break
                case "textonly" :
                    //the original item (a CC) is NOT included. In this case only the text box is added
                    //a textbox is displayed that will populate CC.text, with cc.coding set to  {code:"74964007",system:'http://snomed.info/sct'}
                    //even though the source is not included in the Q, the linkId of the inserted item has '-other' appended
                    //though the text is copied from the source




                    newItem = {text:`${ed.title}`,linkId:`${ed.path}-other`,type:'string'}

                    //todo need to confirm how this will work - what should the definition on the original be?
                    if (sourceItem.definition) {
                        //assume the definition is to a cc - eg something like Condition.code.coding (the syntax is important)
                        //the new element will have Condition.code.text

                        //create the text box definition
                        let ar = sourceItem.definition.split('.')
                        ar[ar.length-1] = 'text'
                        let newDefinition = ar.join('.')
                        newItem.definition = newDefinition


                        //add a fixed value setting the code to 'unknown'
                        let unknown = {system:'http://snomed.info/sct',code:"74964007",display:"Other"}
                        addFixedValue(newItem,sourceItem.definition,'Coding',unknown)
                    }


                    //hide the original
                   //temp - while debugging sourceItem.extension = sourceItem.extension || []
                    // sourceItem.extension.push({url:extHidden,valueBoolean:true})


                    break


            }
            return newItem
        }

        //Add the 'enable when' to the Q
        //updates the item object directly
        //When used by the Composition, we add a prefix which is {compname}.{section name}. (note the trailing dot)
        function addEnableWhen(ed,item,inPathPrefix,errorLog) {



            let allEW = []  //track all EW created as the Q is created. Used to check the links once the Q is finished
            let pathPrefix = ""
            if (inPathPrefix) {
                pathPrefix = inPathPrefix + "."
            }

            if (ed && ed.enableWhen && ed.enableWhen.length > 0) {

                ed.enableWhen.forEach(function (ew) {
                    let qEW = {}

                    //When an EW is in a contained DG, then the paths of the source (in the EW) need to be updated
                    let source = ew.source

                    //--------------
                    //qEW.question = `${pathPrefix}${source}` //linkId of source is relative to the parent (DG)

                    //2Feb - make the question the sourceId. Then, adjust to the path after the Q has been generated
                    //qEW.question = ew.sourcePathId || "MissingSourceId"



                    //oct24 - can directly set the question to the hash of the sourceid
                    //qEW.question = ew.sourceId || "MissingSourceId"
                    if (ew.sourceId) {
                        qEW.question = utilsSvc.getUUIDHash(ew.sourceId)
                    } else {
                        qEW.question = "MissingSourceId"
                    }


                    //---------------

                    //qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                    qEW.operator = ew.operator
                   // qEW.
                    //if the ew.value is an object then assume a Coding. Otherwise a boolean (we only support these 2)

                    let canAdd = false


                    if (typeof ew.value == 'boolean' || ew.operator == 'exists') {
                        //this is a boolean or an 'exists check
                        qEW.answerBoolean = ew.value
                        canAdd = true
                    } else {
                        //let qEW = {operator:ew.operator,answerCoding:ew.value}
                        if (ew.value && ew.value.code) {        //must have a code
                            qEW.answerCoding = ew.value
                            delete qEW.answerCoding.pt  //the preferred term...
                            delete qEW.answerCoding.fsn  //the preferred term...

                            qEW.answerCoding.system = qEW.answerCoding.system || unknownCodeSystem
                            canAdd = true
                        } else {

                        }
                    }

                    //need to determine the path to the question. For now, assume that
                    //qEW.question = `${parent.linkId}.${ew.source}` //linkId of source is relative to the parent (DG)
                   // qEW.question = `${pathPrefix}${ew.source}` //linkId of source is relative to the parent (DG)
                    //note deprecated - in favour of using an id
                    if (canAdd) {

                        //if there is a source ID then the ew can be added. If not, then don't add
                        if ( ew.sourceId ) {
                            item.enableWhen = item.enableWhen || []
                            item.enableWhen.push(qEW)

                            //for the validation we need the target link as well... So this would be an invalid EW on the Q - don't add it!
                            let copyEW = angular.copy(qEW)
                            copyEW.target = item.linkId

                            allEW.push(copyEW)


                            if (item.enableWhen.length >1) {
                                //if there are 2 EW then set the EW behaviour. More than 2 and it will already be set...
                                item.enableBehavior = 'any'    //todo - may need to specify this
                            }

                        } else {
                            errorLog.push({msg:`EW not added for ${ed.path} as sourceId missing in EW`})
                        }





                    }

                })
            }
            return allEW
        }


        //find a specific extension
        function getExtension(item,url,type) {
            let result = []
            if (item && item.extension) {
                for (const ext of item.extension) {
                    if (ext.url == url) {
                        if (type) {
                            let vName = `value${type}`
                            result.push(ext[vName])
                        } else {
                            result.push(ext)
                        }

                    }
                }
            }
            return result
        }

        //return true if has a fixed value
        function isFixed(ed) {
            if (ed.fixedCoding || ed.fixedBoolean || ed.fixedQuantity || ed.fixedRatio || ed.fixedCode) {
                return true
            }
        }

        let services =  {

            getNamedQueries : function (cb) {
                let qry = "model/namedquery"
                $http.get(qry).then(
                    function (data) {
                        let hash = {}
                        data.data.forEach(function (nq) {
                            hash[nq.name] = nq
                        })
                        cb(hash)
                    },function (err) {
                        alert(angular.toJson(err.data))
                        cb({})
                    })
            },

            makeReport : function (Q) {
                //generate a report object for the SDC table view (that displays key extraction / population details)


                let report = {entries:[],variableUsage:{},errors:[]}
                let thing = {text:Q.name}

                //todo - right now I'm looking for specific extensions on the root
                //todo but really need to iterate over all exts as do for items
                //todo - need to refactor extension processing and extension url definitions into an object


                //see if there is an extraction context on the Q (there may also be some on child groups)
                let ar1 = getExtension(Q,extDefinitionExtract,'Canonical')


                if (ar1.length > 0) {
                    //the whole extension is returned
                    let ext = ar1[0]
                    if (ext.extension > 0) {
                        for (const child of ext.extension) {
                            if (child.url == 'definition')

                                thing.extractionContext = child.valueCanonical

                                thing.isSDC = true
                            break
                        }
                    }

                }

                report.entries.push(thing)
                
                //get the variables - can now be defined on an item as well
                //todo - not going to work for compositions I think
                let ar2 = getExtension(Q,extVariable,'Expression')
                ar2.forEach(function (ext) {
                    let thing = {text:Q.name}
                    thing.variable = ext.name
                    thing.contents = ext.expression  //varable type is x-query
                    thing.itemName = ext.name

                    report.entries.push(thing)

                    report.variableUsage[ext.name] = []

                    thing.isSDC = true

                })

                let ar3 = getExtension(Q,extAllocateIdUrl)
                ar3.forEach(function (ext) {

                    let thing = {text:Q.name}
                    thing.level = 0
                    thing.allocateId = thing.allocateId ||  []
                    thing.allocateId.push(ext.valueString)

                    report.entries.push(thing)

                    thing.isSDC = true

                })



                //get the launch contexts. These are fixed ATM but worth displaying
                let arLC = getExtension(Q,extLaunchContextUrl)

                report.launchContext = []
                for (const ext of arLC) {
                    let item = {}
                    ext.extension.forEach(function (child) {

                        switch (child.url) {
                            case "name" :
                                item.name = child.valueCoding.code
                                break
                            case "type" :
                                item.type = child.valueCode
                                break
                            case "description" :
                                item.description = child.valueString
                                break
                        }


                    })

                    report.launchContext.push(item)
                    report.variableUsage[item.name] = []

                }

               // console.log(report.launchContext)


                function processItem(report,item,level) {
                    let thing = {linkId:item.linkId,text:item.text,type:item.type,definition:item.definition}
                    thing.level = level


                    thing.item = makeQHelperSvc.cloneItem(item)


                    if (item.definition) {
                        thing.isSDC = true
                    }

                    let mult = "0.."
                    if (item.required) {
                        mult = "1.."
                    }
                    if (item.repeats) {
                        mult += "*"
                    } else {
                        mult += "1"
                    }

                    thing.mult = mult

                    //look for fixed values. These are values with answerOption, and initialSelected set
                    //todo fix!! answerOption is an array....
                    if (item.answerOption) {
                        thing.isSDC = true
                        //currently only using code & CodeableConcept
                        Object.keys(item.answerOption).forEach(function (key) {
                            //console.log(key)
                            if (item.answerOption[key].initialSelected) {
                                //console.log(item.answerOption[key])
                                let opt = item.answerOption[key]
                                //console.log(opt)
                                if (opt.valueCoding) {
                                    thing.fixedValue = `${opt.valueCoding.code} | ${opt.valueCoding.display} | ${opt.valueCoding.system}`
                                } else if (opt.valueCode) {
                                    thing.fixedValue = opt.valueCode
                                } else if (opt.valueString) {
                                    thing.fixedValue = opt.valueString
                                }

                            }
                        })

                    }

                    if (item.answerValueSet) {
                        thing.valueSet = item.answerValueSet
                    }

                    //now process the extensions. Some we recognize here - others are added with the url

                    if (item.extension) {
                        thing.isSDC = true
                        item.extension.forEach(function (ext) {

                            switch (ext.url) {
                                case extOriginalPath:
                                    thing.originalPath = ext.valueString
                                    break
                                case extAllocateIdUrl:
                                    thing.allocateId = thing.allocateId ||  []
                                    thing.allocateId.push(ext.valueString)
                                    break

                                case extQuantityUnit :
                                    thing.fixedValue = `Units: ${ext.valueCoding.code}`
                                    break
                                case extHidden:
                                    thing.isHidden = ext.valueBoolean
                                    break
                                case extInitialExpressionUrl:

                                    thing.initialExpression = utilsSvc.getExpression(ext.valueExpression)

                                    //add to the variable usage hash
                                    let ar1 = thing.initialExpression.split('.')
                                    let variable = ar1[0].substr(1)
                                    if (report.variableUsage[variable]) {
                                        report.variableUsage[variable] = report.variableUsage[variable] || []

                                        //report.variableUsage[variable].push(item.linkId)
                                        report.variableUsage[variable].push(makeQHelperSvc.cloneItem(item))
                                    } else {
                                        report.errors.push({msg:`variable ${variable} not found at ${item.linkId}`})
                                    }
                                    break
                                case extDefinitionExtract:


                                    const firstOrNull = (arr) => arr.length > 0 ? arr[0] : null

                                    //looks at the sub extension
                                    let resourceType = getExtension(ext,"definition","Canonical")
                                    let fullUrl = getExtension(ext,"fullUrl","String")

                                    let vo = {type: firstOrNull(resourceType),fullUrl:firstOrNull(fullUrl)}


                                    thing.extractionContext = vo //getExtension(ext,"definition","Canonical") //ext.valueCanonical

                                    break

                                case extPopulationContext:
                                    thing.populationContext = ext.valueExpression

                                    break

                                case extDefinitionExtractValue:
                                    report.setValue = report.setValue || []


                                    let v = {}
                                    //v.linkId = item.linkId    //where the extension was located
                                    v.item = makeQHelperSvc.cloneItem(item)
                                    //console.log(ext)
                                    ext.extension.forEach(function (child) {
                                        switch (child.url) {
                                            case 'definition' :
                                                //the path in the extract where this element is to be inserted
                                                v.path = child.valueUri
                                                break
                                            case 'fixed-value' :
                                                //the actual value
                                                const keysStartingWithValue = Object.keys(child).filter(key => key.startsWith('value'));
                                                const values = keysStartingWithValue.map(key => child[key]);
                                                if (values) {
                                                    //will only be 1
                                                    let value = values[0]
                                                    if (typeof value === 'object') {
                                                        v.value = angular.toJson(value)
                                                    } else {
                                                        v.value = value
                                                    }
                                                }


                                               // v.value = child.valueString || child.valueId




                                                break
                                            case 'dynamic-value': //todo - is this used
                                                //an expression
                                                v.expression = child.valueExpression
                                                break
                                            case 'expression':
                                                //an expression
                                                if (child.valueExpression) {
                                                    v.expression = child.valueExpression.expression
                                                }

                                                break
                                            default :
                                                //shouldn't happen - what to do?
                                                break
                                        }


                                    })

                                    report.setValue.push(v)

                                        //add to entries
                                        // let sv = {text:'setValue'}
                                        //report.entries.push(sv)


                                    break

                                case extItemControlUrl :
                                    thing.itemControl = thing.itemControl || []
                                    thing.itemControl.push(ext.valueCodeableConcept)
                                    break

                                case extVariable :

                                    try {
                                        thing.variable = ext.valueExpression.name
                                        thing.contents = utilsSvc.getExpression(ext.valueExpression)
                                        thing.itemName = ext.valueExpression.name
                                    } catch (ex) {
                                        alert(`Invalid expression at ${item.text}. ignoring`)
                                    }

                                    break

                                case extCalculatedExpression :
                                    thing.calculated = utilsSvc.getExpression(ext.valueExpression)

                                    break


                                default:
                                    thing.unknownExtension = thing.unknownExtension || []
                                    thing.unknownExtension.push(ext)
                                    break

                            }

                        })
                    }


                    report.entries.push(thing)

                    if (item.item) {
                        let newLevel = level + 1
                        item.item.forEach(function (child) {
                            processItem(report,child,newLevel)
                        })
                    }
                }
                
                Q.item.forEach(function (item) {
                    processItem(report,item,0)
                })


                //add setValues into entries to make display easier
                report.entries.forEach(function (entry) {
                    if (report.setValue) {
                        report.setValue.forEach(function (value) {
                            if (value.item.linkId == entry.linkId) {
                                entry.setValue = entry.setValue || []
                                entry.setValue.push(value)
                            }

                        })
                    }

                })

                //reports on where expressions are defined and used
                report.expressionUsage = makeQHelperSvc.makeVariableUsage(Q)

                //console.log(report)
                return {report:report}

                function getExpressionDEP(exp) {
                    if (exp && exp.expression) {
                        return exp.expression
                    } else {
                        return ""
                    }

                }

            },

            makeHierarchicalQFromDG : function  (dg,lstElements,config) {
                config.getControlDetails = this.getControlDetails //need to use the function defined in the service object which is called externally...
                //Used in the new Q renderer
                //config.enableWhen (boolean) will cause the enableWhens to be set. It's a debugging flag...

                //config.namedQueries allows the NQ to be passed in
                let pathPrefix = ""
                if (config.pathPrefix) {
                    pathPrefix = config.pathPrefix + "."
                }

                let startInx = config.startInx || 0     //the start index for re-numbering the linkIds

                if (! lstElements || lstElements.length == 0) {
                    return  {allEW:[],hashEd :{} ,hashVS:{}, errorLog:[] }    //this results when there is a missing DG referenced...
                }

                let dgName = dg.name //lstElements[0].ed.path     //first line is the DG name

                //if config.expandVS is true, then the contents of the VS will be expanded as options into the item. May need to limit the length...
                let errorLog = []
                let firstElement = lstElements[0]



              //  let allEW = []      //all EnableWhen. Used for validation


                //all EDs where the valueSet is conditional. Anything that has a dependency of one of these
                //ED's will need to have their dependency adjusted as the ED will not be added to the Q - rather
                //an ED created for each VS will have been added with a linkId of  {linkId}-{inx}
                //This will need to be an OR set of EW
                let conditionalED = {}


                //construct a list of paths to hide (not include in the Q)
                let basePathsToHide = []    //a list of all paths where hideInQ is set. Any elements starting with this path are also set
                //note that hideInQ actually means don't copy to Q
                lstElements.forEach(function (thing) {
                    //Actually, there shouldn't be anything with the mult 0..0 any more - but hideInQ is certainly there
                    if (thing.ed.mult == '0..0') {
                        basePathsToHide.push(thing.ed.path)  //the full path
                    } else if (thing.ed.hideInQ) {
                        //if it's a fixed value, then it will still be added to the Q, but it will be hidden -
                        if (! isFixed(thing.ed) ) {
                            basePathsToHide.push(thing.ed.path)  //the full path
                        }
                    }
                })


                //now create the list of ED to include in the Q
                //we do this first so that we can exclude all child elements of hidden elements as well
                let lstQElements = []

                lstElements.forEach(function (thing) {
                    let ed = thing.ed
                    let okToAdd = true
                    if (ed.mult == '0..0') {okToAdd = false}
                    if (okToAdd) {
                        for (const pth of basePathsToHide) {
                            if (ed.path == pth || ed.path.isChildPath(pth)) {
                                okToAdd = false
                                break
                            }
                        }
                    }


                    if (okToAdd) {
                        lstQElements.push(thing)
                    }
                })


                if (dg.adHocExtension) {
                    //We need to be able to put extensions on the first element - which is the DG.
                    //this entry in allItems is missing a lot of the ed stuff (naturally) so we need to add it here
                    //we have to set a type so the decorateRoutine won't reject it. todo - can this restriction be removed?

                    lstQElements[0].ed.adHocExtension = dg.adHocExtension
                    //sep 18lstQElements[0].ed.type=['string']      //todo - not sure about this...
                    lstQElements[0].ed.type=['group']      //todo - not sure about this...
                }

                //now can create the actual Q


                let Q = {resourceType:'Questionnaire'}

                Q.id = `canshare-${dg.name}`    //this is just a default. Overriden in the next step...

                //make the id match the url. The url has the collection name and dg name to be unique
                if (config.url) {
                    let ar = config.url.split('/')
                    Q.id = ar[ar.length-1]
                }



                Q.name = config.name || dg.name //firstElement.ed.path
                Q.title = dg.title //firstElement.title
                Q.status = 'active'
                Q.title = dg.title
                Q.date = new Date().toISOString()


                Q.url = config.url

                Q.version = config.version || 'draft'
                Q.description = dg.description

                addPrePopExtensions(Q)      //launchPatient & LaunchPractitioner
                addUseContext(Q)
                addPublisher(Q)

                //set any default terminology server on the DG
                if (dg.termSvr) {
                    Q.extension = Q.extension || []
                    let ext = {url:extensionUrls.peferredTerminologyServer,valueUrl:dg.termSvr}
                    Q.extension.push(ext)
                }

                //we always add the patientID variable extension. If there's no references needed, it's just ignored...
                Q.extension = Q.extension || []
                let ext = {url:extAllocateIdUrl,valueString:'patientID'}
                Q.extension.push(ext)



                let hashIdName = {}     //associate an idname (from allocateId) with the path

                config.hashIdName = hashIdName  //when we create the Q item we need to add the id as a fullUrl property in definitionExtract

                //add the named queries as variables in root of the Q
                let namedQueries = snapshotSvc.getNamedQueries(dg.name)     //follows the DG hierarchy
                for (const nq of namedQueries) {
                    addNamedQuery(Q,nq.name,config.namedQueries)
                }


                let extractionContext

                //add definition based data extraction. This is where the DG can be extracted to a FHIR
                //resource using the SDC definition extraction
                //examine the DG hierarchy to see if there is a 'type' in any of the DG parents which is the SDC extraction context
                //note that the extraction context is a complete url (not just a type name)
                //this is where the context is defined on the DG (as opposed to a referenced DG

                let currentItem
                let hashItems = {}      //items by linkId
                let hashEd = {}         //has of ED by path (=linkId)
                let hashVS = {}         //hash of all ValueSets defined

                //create the has of all ED first
                for (const item of lstQElements) {
                    let ed = item.ed
                    let path = ed.path
                    hashEd[path]= ed
                }

                for (const item of lstQElements) {
                    let ed = item.ed
                    let path = ed.path

                    //temp - testing the checker function
                    let testHash = {}
                    //testHash
                    makeQHelperSvc.checkParentalHash(testHash,path)


                    if (currentItem) {
                        //this is not the first
                        let parentItemPath = $filter('dropLastInPath')(path)
                        //todo - testing uuid currentItem = {linkId:`${pathPrefix}${path}`,type:'string',text:ed.title}
                        //temp oct22 currentItem = {linkId:`${ed.id}`,type:'string',text:ed.title}
                        currentItem = {linkId:`${utilsSvc.getUUIDHash(ed.id)}`,type:'string',text:ed.title}

                        //we pass in hashItems so the decorate function can update other items - like setting a fixed value

                       //oct24 - passing in the wrong hash! let vo = decorateItem(currentItem,ed,extractionContext,dg,config,hashItems)
                        let vo = decorateItem(currentItem,ed,extractionContext,dg,config,hashEd)

                        extractionContext = vo.extractionContext




                        if (config.enableWhen) {
                            let ar =  addEnableWhen(ed,currentItem,config.pathPrefix,errorLog)
                        }

                        if (ed.mult.indexOf('..*')> -1) {
                            currentItem.repeats = true
                        }

                        //here is where the new item is added to it's parent...
                        //We need to deal with 'out of order' elements - ie where we get to an item before its parent...
                        let canAdd = true

                        //not being used at present.
                        /*
                        if (vo.excludeFromQ) {
                            canAdd = false
                        }
                        */
                        //console.log(`Adding: ${path} to  ${parentItemPath}`)
                        //this is all code that (hopefully) shouldn't be needed when building a Q from a collection as
                        if (! hashItems[parentItemPath]) {
                            console.error(`${parentItemPath} not present - adding...`)

                            //create an element to add...
                            hashItems[parentItemPath] = {placeHolder:true,linkId:parentItemPath}

                            //we assume the grandparent is there
                            //todo - will generate an exception if not - how best to check?
                            let grandParentPath = $filter('dropLastInPath')(parentItemPath)
                            hashItems[grandParentPath].item = hashItems[grandParentPath].item || []
                            let t = hashItems[parentItemPath]
                            hashItems[grandParentPath].item.push(t)

                        } else {
                            if (hashItems[path] && hashItems[path].placeHolder) {
                                console.error(`${path} is placeholder`)
                                //This is an out of order item that was previously added as a placeholder
                                //we don't want to re-add it - but do need to copy all the attributes across
                                Object.assign(hashItems[path],currentItem)
                                delete  hashItems[path].placeHolder
                                //temp Sep182025 hashItems[path].type = 'group'      //this must be a group if it has children...
                                canAdd = false  //nothing else to do...
                            }
                        }

                        if (canAdd) {
                            //this is where the parent item exists so the current one can just be added
                            //hashItems[parentItemPath] = hashItems[parentItemPath] || {}     //in theory, the parent should always have been added
                            hashItems[parentItemPath].item = hashItems[parentItemPath].item || []
                            hashItems[parentItemPath].item.push(currentItem)
                            //temp Sep182025 hashItems[parentItemPath].type = "group"
                            hashItems[path] = currentItem   //ready to act as a parent...


                         //   if (vo.additionalItems.length > 0) {
                                //the decorate routine added additional items. eg Conditional Valuesets
                                for (let item of vo.additionalItems) {
                                    hashItems[parentItemPath].item.push(item)
                                }

                         //   }


                            //We also need to process 'other' items. These are used in choice elements when the desired option is not in the options list
                            let newItem = addOtherItem(ed,currentItem)
                            if (newItem) {
                                hashItems[parentItemPath].item.push(newItem)
                            }

                            let displayBeforeItem = makeQHelperSvc.makeDisplayItem(ed.displayBefore,extHTMLRender)
                            if (displayBeforeItem) {

                                let l = hashItems[parentItemPath].item.length
                                hashItems[parentItemPath].item.splice(l-1,0,displayBeforeItem)
                            }

                            //And for display items that are added after the actual item
                            let displayAfterItem = makeQHelperSvc.makeDisplayItem(ed.displayAfter,extHTMLRender)
                            if (displayAfterItem) {
                                hashItems[parentItemPath].item.push(displayAfterItem)
                            }

                        }

                    } else {
                        //this is the first item in the DG Q.

                        //temp oct22 - testing uuidscurrentItem = {linkId:`${pathPrefix}${path}`,type:'group',text:ed.title}
                        currentItem = {linkId:`${ed.id}`,type:'group',text:ed.title}
                        currentItem = {linkId:`${utilsSvc.getUUIDHash(ed.id)}`,type:'group',text:ed.title}

                        decorateItem(currentItem,ed,extractionContext,dg,config)

                        if (dg.isTabbedContainer) {
                            let ext = {url: extItemControlUrl}
                            ext.valueCodeableConcept = {
                                coding: [{
                                    code: "tab-container",
                                    system: "http://hl7.org/fhir/questionnaire-item-control"
                                }]
                            }
                            currentItem.extension = currentItem.extension || []
                            currentItem.extension.push(ext)
                        }


                        if (config.enableWhen) {
                            let ar = addEnableWhen(ed,currentItem,config.pathPrefix,errorLog)
                        }

                        //this is the first item in the Q. We place any extraction context defined on the DG
                        // here so it is in the right place for repeated elements...
                        //note that it is already defined - don't use 'let'

                        extractionContext = getExtractionContext(dgName,config.hashAllDG) //the FHIR resource type defined on the DG
                        if (extractionContext) {

                            let vo = {definition:extractionContext}     //this will be for definitionExtract

                            //currently disabled Feb2025- should this be set only in the extensions
                            if (false && dg.idVariable) {
                                vo.fullUrl = dg.idVariable
                            }

                            //we need to see if the DG has any adHoc extensions defined on the root
                            //9Apr2025 - hold on, these will have been processed by decorate item...
                            //todo - it's really the allocateID
                            if (false && dg.adHocExtension) {

                                //now see if there is an allocateId. if there is, then it needs to be added to the
                                // extractDefinition vo and the extension removed from ad hoc
                                let newAdHoc = []
                                for (const ext of dg.adHocExtension) {
                                    if (ext.url == extAllocateIdUrl) {
                                        vo.fullUrl = ext.valueString
                                    } else if (ext.url == extVariable) {

                                        Q.extension = Q.extension || []
                                        Q.extension.push(ext)
                                    } else {
                                        newAdHoc.push(ext)
                                    }
                                }

                                addAdHocExt(currentItem,newAdHoc)

                            }



                            addDefinitionExtract(currentItem,vo)        //ie the extractDefinition that sets the resource to extract to...



                            //does this resource need a reference to patient?

                            //This is a resource that should have a patient reference
                            if (resourcesForPatientReference[dg.type]) {
                                let elementName = resourcesForPatientReference[dg.type].path
                                let definition = `http://hl7.org/fhir/StructureDefinition/${dg.type}#${dg.type}.${elementName}.reference`
                                let expression = "%patientID"
                                addFixedValue(currentItem,definition,null,null,expression)
                            }

                            // - same functionity as addDefinitionExtract setExtractionContext(currentItem,extractionContext)
                            //if there's an extraction context, then add any 'DG scope' fixed values.
                            //fixed values can also be defined on an item... todo TBD
                            addFixedValues(currentItem,dg)

                        }

                        //we'll also add a population context here. This is to support any pre-pop


                        //this sets the Q.item to the first entry (currentItem) - all the others are references off that
                        hashItems[path] = currentItem
                        Q.item = [currentItem]

                    }

                }


                //process the conditional VS
                //



                //NOTE: This does need to be here to support conditional VS - just commenting it out while I check EW creation
                //to avoid confusing things
                //temp correctEW(Q,conditionalED)

                //oct22 - setting the linkId dorectly to the hashed ed.idlet vo = makeQHelperSvc.updateLinkIds(Q,startInx)


                //the 'question' entry in the EW will be to the sourceId id. This replaces with linkId
                //oct22errorLog.push(...  makeQHelperSvc.updateEnableWhen(Q,vo.hashById))

                //oct 24 errorLog.push(...  makeQHelperSvc.updateEnableWhen(Q))

                //in the expression definition in an ED , refer to other ED's putting the path in {{}}
                //this is needed as the linkIds are no longer the path - todo example
                //oct22errorLog.push(...makeQHelperSvc.updateExpressions(Q,vo.hashByLinkId))
                errorLog.push(...makeQHelperSvc.updateExpressions(Q))

                //clear all the item.prefix entres
                makeQHelperSvc.removePrefix(Q)


                //this is the return from the 'makeHierarchicalQFrom DG function
                //oct22 return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog, lidHash:vo.lidHash,maxInx:vo.maxInx}
                return {Q:Q,hashEd:hashEd,hashVS:hashVS,errorLog:errorLog}



                //add details to item
                //extraction context is the url of the profile (could be a core type)
                function decorateItem(item,ed,extractionContext,dg,config,hashEd) {
                    if (! ed.type) {
                        return
                    }
                    //let excludeFromQ = false

                    //some functions - eg conditional vs - can add additional items...
                    let additionalItems = []

                    //save the original path. useful when tracking down the origin of things...
                    makeQHelperSvc.addExtensionOnce(item,{url:extOriginalPath,valueString:ed.path})

                    let edType = ed.type[0]     //actually be the name of a contained DG

                    //If this ed is a reference to another DG, it can have a different extraction context...
                    if (config.hashAllDG[edType]) {

                        let referencedDG = config.hashAllDG[edType]
                        let extractType = snapshotSvc.getExtractResource(edType)    //the FHIR type this DG extracts to, if any... Follows the parental hierarchy

                        //this is an item that is extracted
                        if (extractType) {

                            let vo = {}     //this will have all the child extensions for definitionExtract
                            vo.definition = `http://hl7.org/fhir/StructureDefinition/${extractType}`     //set the canonical for the extract

                            if (extractType == 'Patient') {
                                vo.fullUrl = 'patientID'            //sets the fullUrl to the variable created by allocateID and added to every Q

                                //todo connectathon

                                vo.ifNoneExist = "'Patient?identifier=' + %resource.item.item.item.where(linkId='auPathRequest1.patient.identifier.system').answer.value"
                                vo.ifNoneExist += "+ '|' + %resource.item.item.item.where(linkId='auPathRequest1.patient.identifier.value').answer.value"

                            } else {
                                //if this resource was the target of another in the resourceReferences array, it will have had a fullUrl defined...
                                //todo - may deprecate this...

                                if (config.hashIdName[ed.path]) {
                                    vo.fullUrl = config.hashIdName[ed.path]
                                }

                                //does the DG that is being referenced here have ns idVariable set?
                                //If so, then we need to set the fullUrl to that value
                                //todo - need a snapshot function to follow the parental path

                                if (false && referencedDG.idVariable) {
                                    vo.fullUrl = referencedDG.idVariable
                                }
                            }

                            //we only want to do this if there isn't already a definitionExtract set in ad hoc extensions.
                            //we need to retrieve the DG that corresponds to the extract type to see if it has been defined there
                            //note if we wanted to support DG inheritance we'd need to walk up the chain - but that does bring in complexities!
                            let canAddDE = true
                            if (referencedDG.adHocExt) {
                                let json = angular.fromJson(referencedDG.adHocExt)
                                for (let ext of json) {
                                    if (ext.url == extDefinitionExtract) {
                                        canAddDE = false
                                        break
                                    }
                                }
                            }


                            if (canAddDE) {
                                addDefinitionExtract(currentItem,vo)        //ie the extractDefinition that sets the resource to extract to...

                            }




                            addAdHocExtension(Q,item,referencedDG.adHocExtension)



                            //note to me - don't think this is needed now
                            if (false && ed.markTarget) {
                                //this is a resource that is the target of another. It needs the canonical - not allocateId extension
                                vo.fullUrl = ed.markTarget

                            }


                            //This is a resource that should have a patient reference
                            if (resourcesForPatientReference[extractType]) {
                                let elementName = resourcesForPatientReference[extractType].path
                                let definition = `http://hl7.org/fhir/StructureDefinition/${extractType}#${extractType}.${elementName}.reference`
                                let expression = "%patientID"
                                addFixedValue(item,definition,null,null,expression)
                            }


                            if (ed.markReference && ed.markReference.length > 0) {
                                //This is a reference to a marked target
                                //definition format: http://hl7.org/fhir/StructureDefinition/ServiceRequest#ServiceRequest.specimen.reference

                                ed.markReference.forEach(function (ref) {
                                    let ar = ref.definition.split('.')
                                    let definition = `http://hl7.org/fhir/StructureDefinition/${ar[0]}#${ref.definition}.reference`
                                    let expression = `%${ref.idName}`
                                    addFixedValue(item,definition,null,null,expression)
                                })
                            }

                        }


                        //this ed is a child ED. Des this DG have an extraction context? Curentlly a FHIR resource type, but could be a profile

                        //is there an extraction context (dg.type) on this DG or any of its parents
                        //todo - check this. I think this extractionContext is in a different scope - ? should change name

                        //the extractionContext is preserved across calls to decorate()
                        //this allows it to flow into children...
                        //If the DG has no extraction context, it won't be updated...

                        extractionContext = getExtractionContext(edType,config.hashAllDG) || extractionContext


                        if (extractionContext) {
                            addFixedValues(item,referencedDG)
                        }
                    }


                    //if this item has a selected Named Query, then add it as a population context
                    if (ed.selectedNQ) {
                        addPopulationContext (ed.selectedNQ,item)
                    }



                    if (ed.itemCode && ed.itemCode.code) {

                        item.code = [ed.itemCode]

                        if (extractionContext == 'http://hl7.org/fhir/StructureDefinition/Observation') {
                            //add an definitionExtractValue extension if this is an observatiob
                            let canonicalUrl = `http://hl7.org/fhir/StructureDefinition/Observation#Observation.code`
                            let value = {coding:[ed.itemCode]}
                            addFixedValue(item,canonicalUrl,"CodeableConcept",value)
                        }

                    }

                    item.prefix = ed.id     //save the Id in the prefix. We'll need it for adjusting the EnableWhens

                    //add any units
                    addUnits(item,ed)


                    //the function can return additional items to insert into the Q as peers after this one.
                    //this is needed if there is more than one conditional vs

                    //additionalItems.push(... makeQHelperSvc.addConditionalVS(item,ed,hashEd))

                    //The only way an element here will have hideInQ set but still be included is for fixed values.
                    //they get added to the Q - but with the hidden extension so they're available for extraction

                    //hiddenInQ is an item that does appear but not shown
                    //not the same as hideInQ which means they dont appear in Q at all (poor naming choice there)
                    if (ed.hideInQ || ed.hiddenInQ) {
                        item.extension = item.extension || []
                        item.extension.push({url:extHidden,valueBoolean:true})
                    }

                    if (ed.mult) {
                        if (ed.mult.indexOf('1..') > -1) {
                            item.required = true
                        }
                        //multiple
                        if (ed.mult.indexOf('..*') > -1) {
                            item.text += " *"
                        }
                    }

                    //set the control type. Do this early on as other fnctions may change it (eg fixedCoding)
                    //note that the function is defined on config as the scope is a little clumsy...
                    let vo = config.getControlDetails(ed)
                    item.type = vo.controlType


                    additionalItems.push(... makeQHelperSvc.addConditionalVS(item,ed,hashEd,errorLog))


                    switch (vo.controlHint) {
                        case "autocomplete" :
                            addItemControl(item,'autocomplete')
                            break
                        case "radio" :
                            addItemControl(item,'radio-button')
                            break
                        case "check-box" :
                            addItemControl(item,'check-box')
                            break
                    }

                    //set the ValueSet or options from the ed to the item
                    //the fixed takes precedence, then ValueSet then options
                    //todo - need to look for other datatypes than can be fixed



                    if (edType == 'code') {
                        if (ed.fixedCode) {
                            item.answerOption = [{valueString:ed.fixedCode,initialSelected:true}]
                        }
                    }

                    if (edType == 'Identifier') {


                        if (ed.identifierSystem) {
                            //an identifier system has been set - add the fixedValue extension to the item
                            if ( extractionContext)  {
                                let ar = extractionContext.split('/')
                                let canonical = `${extractionContext}#${ar[ar.length-1]}.identifier.system`
                               // console.log(canonical)
                                addFixedValue(item,canonical,"String",ed.identifierSystem)
                            } else {
                                alert(`Processing ${dgName} which has an identifier extraction set but there's no extraction context on the DG`)
                            }

                        }
                    }

                    if (edType == 'CodeableConcept') {

                        //check for fixedCoding. Handles in 2 ways.
                        // If there's an extractionContext and a definition, then use the definitionExtractValue extension (as it's set up for extarction)
                        //If not, then set an answeroption with initialSelected and hide it

                        //need to use hidden answeOption approach as for extensions, the element needs to be
                        //there to attach the value[x] part of the extension...

                        if (ed.fixedCoding) {

                            let concept = ed.fixedCoding
                            delete concept.fsn


                            let canUseExtension = true
                            //the actual resource element to populate...
                            let canonical = `${extractionContext}#${ed.definition}`
                            if (! extractionContext) {
                                //errorLog.push({msg:`Resource type not set for fixed value in ${ed.path}`})
                                canUseExtension = false
                            }
                            if (! ed.definition) {
                                canUseExtension = false
                               // errorLog.push({msg:`Definition (extract path) not set for fixed value in ${ed.path}`})
                            }

                            if (! canUseExtension ) {
                                //need an answeroption with initial selected
                                item.answerOption = item.answerOption || []
                                let ao = {valueCoding:concept,initialSelected:true}
                                item.answerOption.push(ao)
                                //makeQHelperSvc.addExtension(item,{url:extHidden,valueBoolean:true})
                                makeQHelperSvc.addExtensionOnce(item,{url:extHidden,valueBoolean:true})

                            } else {
                                //the fixedValueExtension needs to be added to the parent
                                let ar1 = ed.path.split('.')
                                ar1.pop()
                                let p1 = ar1.join('.')
                                //todo >>>>>>>>> !!!! THis is not correct!! We need an item not an ed...
                                let parentItem = hashEd[p1]
                                if (parentItem) {
                                    addFixedValue(parentItem,canonical,'Coding',concept)
                                } else {
                                    errorLog.push(`Path ${p1} empty setting fixed value`)
                                }
                            }




                            //Don't include this item in the Q.
                            //There could be an issue if this is a parent - but a parent shouldn't have a fixed value...

                            // temp - why did I exclude??? excludeFromQ = true

                            //change the type to a string (the renderer may complain if still a choice with no values) and hide it in the Q
                           // item.type = 'string'
                           // makeQHelperSvc.addExtension(item,{url:extHidden,valueBoolean:true})


                        } else {
                            //no fixed value - check for valuesets & options
                            if (ed.valueSet) {
                                //check for any spaces in the valueSet url
                                if (ed.valueSet.indexOf(' ') > -1 ) {
                                    //this is an illegal vs name
                                    item.answerOption = [{valueCoding : {display:"The ValueSet name is illegal (has a space)"}}]
                                    errorLog.push({msg:`${ed.path} has an invalid valueSet: ${ed.valueSet}. The valueSet was not included`})

                                } else {
                                    //hash of valueset by path
                                    hashVS[ed.valueSet] = hashVS[ed.valueSet] ||  []
                                    hashVS[ed.valueSet].push(ed.path)

                                    if (config.expandVS) {
                                        //if we're expanding the VS, then add all the contents as optoins...
                                        //item.answerOption = []

                                        let options = vsSvc.getOneVS(ed.valueSet)
                                        if (options && options.length > 0 && options[0].code !== 'notfound') {
                                            item.answerOption = []
                                            for (const concept of options) {
                                                concept.system = concept.system || unknownCodeSystem
                                                item.answerOption.push({valueCoding : concept})
                                            }
                                        } else {
                                            //Dec 9 - leave the valueset there if couldn't be expanded

                                            item.answerValueSet = ed.valueSet
                                            //item.answerOption.push({valueCoding : {display:"The ValueSet is missing or empty"}})
                                        }

                                    } else {
                                        //otherwise, add the answervalueSet property and let the renderer retrieve the contents

                                        let vs = ed.valueSet
                                        if (vs.indexOf('http') == -1) {
                                            vs = `https://nzhts.digital.health.nz/fhir/ValueSet/${vs}`
                                        }


                                        item.answerValueSet = vs //ed.valueSet
                                    }
                                }
                            } else if (ed.options && ed.options.length > 0) {
                                item.answerOption = []


                                for (const concept of ed.options) {
                                    let con = makeQHelperSvc.cleanCC(concept)
                                   // delete concept.fsn
                                   // delete concept.pt
                                   // concept.system = concept.system || unknownCodeSystem
                                    item.answerOption.push({valueCoding : con})
                                }
                            } else {
                                //just leave out the message - fix it in the autooring side
                              //  item.answerOption = [{valueCoding : {display:"There is neither a ValueSet nor options"}}]
                            }

                        }


                    }

                    if (edType == 'Quantity') {
                        //https://smartforms.csiro.au/docs/components/quantity

                        if (ed.fixedQuantity) {
                            if (ed.fixedQuantity.unit) {
                                let ext = {url:extQuantityUnit}
                                ext.valueCoding = {code:ed.fixedQuantity.unit,system:"http://unitsofmeasure.org",display:ed.fixedQuantity.unit}
                                item.extension = ed.extension || []
                                item.extension.push(ext)
                            }
                        }
                    }

                    //placeholder
                    if (ed.placeHolder) {
                        let ext = {url:extensionUrls.entryFormat,valueString:ed.placeHolder}
                        //let ext = {url:extPlaceHolderUrl,valueString:ed.placeHolder}
                        item.extension = item.extension || []
                        item.extension.push(ext)

                    }

                    if (ed.instructions) {



/* - I think I'm using this incorrectly... disable for now
                        let child = {type:'display',linkId:`${ed.linkId}-instructions`,text:ed.instructions}
                        let cc = {coding:[{code:"instructions",system:"http://hl7.org/fhir/questionnaire-display-category"}]}
                        let ext = {url:extensionUrls.displayCategory,valueCodeableConcept:cc}
                        child.extension =  [ext]

                        item.extension = item.extension || []
                        item.extension.push(ext)

                       // item.item = item.item || []
                       // item.item.push(child)
                        */


                    }

                    if (ed.helpText){

                        const guid = utilsSvc.getUUID() //createUUID()

                        let foItem = {linkId:utilsSvc.getUUIDHash(guid),text:ed.helpText,type:'display'}

                        let ext1 = {url:extItemControlUrl}
                        ext1.valueCodeableConcept = {
                            coding: [{
                                code: "flyover",
                                system: systemItemControl
                            }]
                        }
                        foItem.extension = [ext1]
                        item.item = item.item || []
                        item.item.push(foItem)

                    }


                    //There is a pre-pop expression - set as initial value
                    if (ed.prePop) {

                        let ext = {url:extInitialExpressionUrl}

                        //todo - not sure if 'Launch is needed
                        //Assume a naming convention for context names - '%Launch{resourcetype}
                        //let expression = `%Launch${ed.prePop}`
                        let expression = `${ed.prePop}`
                        //let expression = `%${dg.name}.${ed.prePop}`

                        ext.valueExpression = {language:"text/fhirpath",expression:expression}
                        item.extension = item.extension || []
                        item.extension.push(ext)

                    }

                    if (ed.defaultCode) {
                        item.initial = item.initial || []
                        item.initial.push({valueString:ed.defaultCode})
                    }

                    if (ed.defaultCoding) {
                        let defaultCoding =  makeQHelperSvc.cleanCC(ed.defaultCoding)
                        let found = false
                        if (item.answerOption) {
                            for (const ao of item.answerOption) {
                                if (ao.code == defaultCoding.code) { //only checking the code
                                    ao.initialSelected = true
                                    found = true
                                    break
                                }
                            }
                        }
                        if (! found) {
                            errorLog.push({msg:`${ed.path} has a default value not in the answerOptions (It may be in the valueset)`})
                        }

                    }

                    //collapsible sections
                    if (ed.collapsible) {
                        let ext = {url:extCollapsibleUrl}
                        ext.valueCode = ed.collapsible
                        item.extension = item.extension || []
                        item.extension.push(ext)
                    }

                    //table layout for a group
                    if (ed.gtable) {
                        addItemControl(item,'gtable')

                    }

                    //grid layout
                    if (ed.sdcGrid) {
                        addItemControl(item, 'grid')
                    }

                    addAdHocExtension(Q,item,ed.adHocExtension)


                    //important that this segment is the last as it can adjust items (eg the valueset stuff)
                    if (ed.definition && extractionContext) {
                        //this will be the extract path for this element into the target resource
                        //right now assumes extracting to a core FHIR resource - will need further thought if profiled...

                        //may need to adjust definition to add type (eg NZName) for 'utility' DG's used elsewhere
                        let definition = ed.definition
                        let ar = extractionContext.split('/')
                        let resourceType = ar[ar.length-1]      //todo - this assumes core types only...  need to think about profiles later
                        definition = definition.replace('%root%',resourceType)
                        item.definition = `${extractionContext}#${definition}`

                        //Add the extension url as a definitionExtractValue
                        if (ed.extractExtensionUrl) {
                            //the definition will be something like Specimen.collection.extension.value
                            let ar1 = definition.split('.')
                            if (ar1.length > 2) {
                                ar1.splice(-2,2)    //remove the 2 on the end

                                let url = `${extractionContext}#${ar1.join('.')}.extension.url`
                                //let url = `${extractionContext}#${resourceType}.extension.url`

                                addFixedValue(item,url,"String",ed.extractExtensionUrl)
                            } else {
                                errorLog.push({msg:`${ed.path} has an incorrect definition`})
                            }

                        }
                    }



                    //todo - could this return additional items to insert as a peer to this one?
                    //conditonal VS would be a use for this...

                    //return {excludeFromQ:excludeFromQ,extractionContext :extractionContext}

                    return {extractionContext :extractionContext,additionalItems:additionalItems}

                }


            },


            getAllEW : function (Q) {
                //Create a hash of all the 'EnableWhens' in a Q
                //used by previewQ
                let hashAllEW = {}


                let hashAllElements = {} // hash of all items so can locate the dependency


                function getEW(item) {
                    hashAllElements[item.linkId] = item
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            hashAllEW[item.linkId] = hashAllEW[item.linkId] || []
                            //title is the thing that is being effected, ew are the rules for showing
                            //item.linkId is the linkId of the item
                            hashAllEW[item.linkId].push({title:item.text,ew:ew})
                        })
                    }

                    if (item.item) {
                        item.item.forEach(function (child) {
                            getEW(child)
                        })
                    }
                }


                if (Q.item) {
                    Q.item.forEach(function (item) {
                        getEW(item)
                    })
                }

                let arEW = []
                //add the items to the ew hash
                Object.keys(hashAllEW).forEach(function (key) {     //key is the linkId of the target item
                    let target =  hashAllElements[key]
                    let arConditions = hashAllEW[key]         //the items in this element  whose visibility is effected by the dependency
                    //let ar = hashAllEW[key]     //this is the item whose visibility is controlled

                    arConditions.forEach(function (ewObject) {      // ewObject = {dep: ew: }

                        //locate the dependent item - ie the one whose value enables the source
                        let dep = hashAllElements[ewObject.ew.question] || {text:'not found in Q'}
                        //ewObject.dep = dep

                        //construct a single item to represent the dependency.
                        // If a single item were 2 have 2 dependencies (ews) there will be multiple iteme
                        let item = {targetText : target.text,targetItem:ewObject.ew }
                        item.dep = dep
                        item.depText = dep.text
                        arEW.push(item)

                    })
                })

                return arEW

            },

            getControlDetails : function(ed) {

                //return the control type & hint based on the ed

                let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
                let controlType = "string"          //this has to be one of the defined type values

                if (ed.options && ed.options.length > 0) {
                    controlHint = "drop-down"
                    controlType = "choice"
                }

                if (ed.type) {
                    switch (ed.type[0]) {
                        case 'display' :
                            controlType = "display"
                            controlHint = "display"
                            break
                        case 'string' :
                            controlType = "string"      //default to single text box
                            if (ed.controlHint == 'text') {
                                controlType = "text"
                            }
                            break
                        case 'boolean' :
                            controlHint = "boolean"
                            controlType = "boolean"
                            break
                        case 'decimal' :
                            controlHint = "decimal"
                            controlType = "decimal"
                            break
                        case 'integer' :
                            controlHint = "integer"
                            controlType = "integer"
                            break
                        case 'Quantity' :
                            controlHint = "quantity"
                            controlType = "quantity"
                            if (ed.units) {
                                //p
                                //console.log(ed.units)
                            }
                            break
                        case 'dateTime' :
                            controlHint = "dateTime"
                            controlType = "dateTime"
                            break
                        case 'date' :
                            controlHint = "date"
                            controlType = "date"
                            break
                        case 'CodeableConcept' :
                            //  controltype is always choice. May want typeahead later

                            controlHint = "drop-down"
                            controlType = "choice"

                            if (ed.controlHint ) {
                                controlHint = ed.controlHint
                                //csiro only supports autocomplete on open-choice
                                if (controlHint == 'autocomplete') {
                                    controlType = "open-choice"
                                }
                            }
                            break
                        case 'Group' :
                        case 'group' :
                            //sep18controlHint = "display"
                            //sep18controlType = "display"

                            controlHint = "group"
                            controlType = "group"

                            break
                        /*
                        case 'Identifier' :
                            controlHint = "Identifier"
                            controlType = "Identifier"
    */

                    }

                    //determine if this is a referece to another DG
                    //make a display if so as we're not nesting in the Q in the same way as in th emodel
                    //??? why display - this must be a group surely!
                    let type = ed.type[0]
                    if (snapshotSvc.getDG(ed.type[0])) {
                        //controlHint = "display"
                        //controlType = "display"

                        controlHint = "group"
                        controlType = "group"

                    }

                }


                return {controlType:controlType,controlHint:controlHint}
            },


        }

        return services


    })