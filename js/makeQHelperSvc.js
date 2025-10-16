angular.module("pocApp")




    //try not to add depencies to this service
    .service('makeQHelperSvc', function(utilsSvc,$uibModal) {

        extensionUrls = {}
        extensionUrls.displayCategory = "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory"
        extensionUrls.itemControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extensionUrls.entryFormat = "http://hl7.org/fhir/StructureDefinition/entryFormat"
        extensionUrls.peferredTerminologyServer = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer"

        extensionUrls.extDefinitionExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
        extensionUrls.extDefinitionExtractValue = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue"

        extensionUrls.extAllocateIdUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
        extensionUrls.extLaunchContextUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"

        extensionUrls.initialExpression = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"

        extensionUrls.candidateExpression = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-candidateExpression"


        extensionUrls.releaseNotes = "http://canshare.co/nz/StructureDefinition/canshare-release-notes"
        let unknownCodeSystem = "http://example.com/fhir/CodeSystem/example"

        //colours for the questionnaire graph
        objColours = {
            "resource" : "tomato",
            "group" : "moccasin",
            "info" : "palegreen"
        }


        return {

            addConditionalVS : function (item,ed) {
                //Adds the extension to support conditional ValueSets
             //   iif(%country.answer.value.code == 'AU', 'http://example.org/Valueset/Au-States')
         //   | iif(%country.answer.value.code == 'NZ', 'http://example.org/Valueset/NZ-States')
                /* "conditionalVS": [
        {
          "path": "cvs.control",
          "value": {
            "code": "opt1",
            "display": "opt1"
          },
          "valueSet": "https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm8-adrenal-cortical-carcinoma-cm"
        },
        {
          "path": "cvs.control",
          "value": {
            "code": "opt2",
            "display": "opt2"
          },
          "valueSet": "https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm8-adrenal-cortical-carcinoma-cn"
        }
      ],*/

                if (ed.conditionalVS && ed.conditionalVS.length > 0) {
                    let ar = []
                    for (const cv of ed.conditionalVS) {
                        let path = cv.path   //the path to the controlling element
                        let value = cv.value.code   //the code that will select the vs
                        let vs = cv.valueSet // the valueset that will be returned
                        let cond = `iif(descendants().where(linkId = '{{${path}}}').answer.first().value.code = '${value}', '${vs}')`
                      //temp  ar.push(cond)
                        ar[0] = cond
                        console.log(cond)
                    }

                    //now construct the extension
                    let exp = ""
                    for (const cond of ar) {
                        exp = exp + cond + " | "
                    }
                    exp = exp.slice(0,-2)

                    let ext = {url:extensionUrls.candidateExpression}
                    ext.valueExpression = {expression:exp,language:"text/fhirpath"}
                    item.extension = item.extension || []
                    item.extension.push(ext)



                }

            },

            removePrefix : function (Q) {
                //we use the prefix to store the ED id's so they can be adjusted in for EW. This removed them when the Q is complete

                function processItem(item) {
                    delete item.prefix
                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }

                }

                processItem(Q)


            },

            showItemDetailsDlg : function (item,Q) {
                $uibModal.open({

                    size : 'xlg',
                    templateUrl: 'modalTemplates/viewItem.html',
                    controller: 'viewItemCtrl',

                    resolve: {
                        item: function () {
                            return item
                        }, Q: function () {
                            return Q
                        }
                    }
                })
            },

            getExtensionSummary : function (item) {
                //generate a summary of extensions on a Q item
                let summary = {unknownExt:[],allocateId:[],defExt : [],defExtValue:[], lc:[],ie:[]}
                if (item.extension) {
                    //summary.extensions = item.extension    //in case the caller needs access to raw data
                    for (const ext of item.extension) {
                        //pull out the specific extensions we are interested in
                        switch (ext.url) {
                            case extensionUrls.initialExpression :
                                //should only be 1
                                summary.ie.push(ext.valueExpression.expression)
                                break
                            case extensionUrls.extLaunchContextUrl :
                                let voLC = {}
                                ext.extension.forEach(function (child) {
                                    switch (child.url) {
                                        case 'name' :
                                            voLC.name = child.valueCoding
                                            break
                                        case 'type' :
                                            voLC.type = child.valueCode
                                            break
                                    }
                                })
                                summary.lc.push(voLC)
                                break
                            case extensionUrls.extAllocateIdUrl :
                                summary.allocateId.push(ext.valueString)
                                break
                            case extensionUrls.extDefinitionExtract:
                                let vo = {}
                                ext.extension.forEach(function (child) {
                                    switch (child.url) {
                                        case 'definition' :
                                            vo.type = child.valueCanonical
                                            break
                                    }
                                })
                                summary.defExt.push(vo)
                                break

                            case extensionUrls.extDefinitionExtractValue:
                                let vo1 = {}
                                ext.extension.forEach(function (child) {
                                    switch (child.url) {
                                        case 'definition' :
                                            vo1.path = child.valueUri.replace('http://hl7.org/fhir/StructureDefinition/',"")
                                            break
                                        case 'fixed-value' :
                                            vo1.value = child.valueCoding || child.valueString
                                            break
                                        case 'expression' :
                                            vo1.expression = child.valueExpression
                                            break

                                    }
                                })
                                summary.defExtValue.push(vo1)

                                break
                            default:
                                summary.unknownExt.push(ext)

                        }

                    }



                }
                return summary

            },

            getItemGraph : function (Q) {
                //generate graph of Q items

                let arNodes = []
                let hashHodes = {}  //hash by linkId
                let arEdges = []


                function processItem(parentNode,item) {
                    let node = {id: item.linkId, label: item.text,shape: 'box'}
                    node.data = {item:item,meta:{}}

                    if (item.type == 'group') {
                        node.color = objColours.group
                    }

                    if (item.type == 'display') {
                        node.color = objColours.info
                    }

                    if (item.extension) {
                        for (const ext of item.extension) {
                            if (ext.url == extensionUrls.extDefinitionExtract) {
                                node.color = objColours.resource
                                for (const child of ext.extension) {
                                    if (child.url == 'definition') {
                                        node.data.meta.extractType = child.valueCanonical
                                    }

                                }

                            }
                        }
                    }



                    arNodes.push(node)
                    hashHodes[item.linkId] = node

                    let edge = {id: 'e' + arEdges.length +1,
                        to: item.linkId,
                        from: parentNode.id,
                        color: 'black',
                        label: '',
                        arrows : {to:true}}
                    arEdges.push(edge)

                    if (item.item) {
                        for (const child of item.item) {
                            let parentNode = hashHodes[item.linkId]

                            processItem(parentNode,child)
                        }
                    }

                }

                //create root node as parent
                let rootNode = {id: "root", label: "Questionnaire",shape: 'box',color:'red'}
                rootNode.data = {item:{}}
                arNodes.push(rootNode)
                hashHodes[rootNode.id] = rootNode

                //call all items of Q
                for (const item of Q.item) {
                    processItem(rootNode,item)
                }

                //generate graph
                let nodes = new vis.DataSet(arNodes)
                let edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                let graphData = {
                    nodes: nodes,
                    edges: edges
                };

                return {graphData:graphData}




            },
            getExtensionUrls : function () {
                return extensionUrls
            },

            getHelpElements(item) {
                //get all the help text elements associated with an item
                //let instructionExt = extensionUrls.displayCategory      //instructions are

                let vo = {}

                //placeholder
                //if (item.extension) {
                    for (const ext of item.extension || []) {
                        if (ext.url == extensionUrls.entryFormat) {
                            vo.placeHolder = ext.valueString
                        }
                    }
                //}

                //Instructions & helptext
                if (item.item) {
                    for (const child of item.item) {
                        if (child.extension) {
                            for (const ext of child.extension) {
                                if (ext.url == extensionUrls.displayCategory) {
                                    //this extension marks the item as the categry. Currently only 'instruction' supported so no need to check cc
                                    vo.instructions = child.text
                                }
                                if (ext.url == extensionUrls.itemControl) {
                                    if (ext.valueCodeableConcept &&
                                        ext.valueCodeableConcept.coding &&
                                            ext.valueCodeableConcept.coding[0].code == 'flyover') {
                                        vo.helpText = child.text
                                    }

                                }

                            }
                        }
                    }
                }

                return vo


            },

            cleanCC : function (cc) {
                //remove the fsn attribute from a CC
                if (cc) {
                    delete  cc.fsn
                    delete  cc.pt
                    if (cc.code) {
                        cc.code = cc.code.replace(/\s+/g, '');
                    } else {
                        cc.code="unknown"
                    }

                    cc.system = cc.system || unknownCodeSystem
                    return cc
                }
            },
            cloneItem : function (item) {
                //create a copy of an item, removing the item node
                let clone = angular.copy(item)
                delete clone.item
                return clone
            },
            updateExpressions: function (Q,hashLinkId) {
                //update any expressions based on the replacements in hashLinkId
                let logIssues = []

                function processItem(item) {
                    if (item.extension) {
                        for (let ext of item.extension) {
                            if (ext.valueExpression) {
                                let exp = ext.valueExpression.expression

                                //looking for {{?}} placeholders
                                let newExp = exp.replace(/{{(.*?)}}/g, (_, key) => {
                                    const trimmedKey = key.trim();
                                    let newLinkId = getReplacementLinkId(trimmedKey)
                                    if (newLinkId){
                                        return newLinkId
                                    } else {
                                        logIssues.push(trimmedKey); // Log missing key
                                        return `{{${trimmedKey}}}`; // Keep placeholder
                                    }
                                })

                                ext.valueExpression.expression = newExp

                            }
                        }
                    }

                    if (item.item) {
                        for (let child of item.item) {
                            processItem(child)
                        }
                    }
                }


                processItem(Q)  //extensions on the Q

                for (let item of Q.item) {
                    processItem(item)
                }

                return logIssues

                function getReplacementLinkId(key) {

                    if (hashLinkId[key]) {
                        return hashLinkId[key]
                    } else {
                        //if there's not a direct map in the hash, then look for any entries that end with this key
                        //I *think* that will safely support circumstances where a DG is embedded in another
                        //todo - check this, and also use for enableWhen
                        //todo - this assumes that the path segment is the same as the DG name

                        let ar = []
                        for (const hashKey of Object.keys(hashLinkId)) {
                            let oldId = hashLinkId[hashKey]
                            let t1 = hashKey.toLowerCase()
                            let t2 = key.toLowerCase()
                            if (t1.endsWith(t2)) {
                            //if (hashKey.endsWith(key)) {
                                ar.push(oldId)
                            }
                        }

                        if (ar.length == 1) {
                            return ar[0]
                        } else {
                            console.error(`Unable to map ${key} to the updated value`)
                        }

                    }
                }


            },

            updateEnableWhen : function (Q,hashId) {
                //update the enableWhens based on the replacements in hashId which used the ED id

                let logIssues = []

                function processItem(item) {
                    if (item.enableWhen) {
                        //we don't include any EW with errors as the form won't render
                        let lst = item.enableWhen
                        item.enableWhen = []

                        lst.forEach(function (ew) {
                            //note that this is the id of the controlling element
                            let questionId = ew.question //ew.sourceId    //the ED id of the source (controlling) elemeny

                            if (hashId[questionId]) {
                                ew.question = hashId[questionId]
                                item.enableWhen.push(ew)
                            } else {
                                logIssues.push({msg:`EnableWhen at ${item.linkId} refers to ${questionId} which is not found`})
                                //console.warn(`${questionId} not found at ${item.linkId}`)
                            }
                        })

                        if (item.enableWhen.length == 0) {
                            delete item.enableWhen
                        }



                    }
                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }
                }



                for (let item of Q.item) {
                    processItem(item)
                }

                return logIssues

            },

            updateEnableWhenDEP : function (Q,hashLinkId) {
                //update the enableWhens based on the replacements in hashLinkId

                let logIssues = []

                function processItem(item) {
                    if (item.enableWhen) {
                        for (const ew of item.enableWhen) {
                            let question = ew.question
                            if (hashLinkId[question]) {
                                ew.question = hashLinkId[question]
                            } else {
                                //The ew.source is set to the full path within the DG that it is defined
                                let ar = ew.question.split('.')
                                //todo - if we make the path in the container the same as the DG name then we don't need to remove it and it will be more robust
                                ar.splice(0,1)      //remove the first in the path - the dg where the ew is defined
                                let matchingPath = ar.join('.')     //we're looking for an element whose path ends with this
                                let matches = []        //matching elements - there should only be 1
                                for (const key of Object.keys(hashLinkId)) {
                                    if (key.endsWith(matchingPath)) {
                                        matches.push(hashLinkId[key])
                                    }
                                }
                                if (matches.length == 1) {
                                    ew.question = matches[0]
                                } else {
                                    console.log(`Error fining match for EW path ${ew.source}. ${matches.length} matchs found`)
                                }


                                logIssues.push({msg:`${question} not found at ${item.linkId}`})
                            }
                        }
                    }
                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }
                }



                for (let item of Q.item) {
                    processItem(item)
                }

                return logIssues

            },

            updateLinkIds : function (Q,startInx) {
                //change all the linkIds from the path to a sequential number. For cosmetic reasons
                //does mean that EW and expressoins will need to be separately updated
                let that = this
                let hashByLinkId = {}
                let hashById = {}
                let ctr = startInx || 0

                function processItem(item,updateLinkId) {
                    //update the hash
                    if (updateLinkId) {
                        let key = `id-${ctr++}`
                        hashByLinkId[item.linkId] = key
                        //some items won't have a prefix as they were inserted by the Q builder - eg help text
                        if (item.prefix) {
                            hashById[item.prefix] = key     //using prefix to store the ED id
                        }

                        item.linkId = key
                    }

                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child,updateLinkId)
                        }
                    }

                }


                //Update the LinkIds
                Q.item.forEach(function (item) {
                    processItem(item,true)
                })


                return {hashByLinkId:hashByLinkId,hashById:hashById,maxInx:ctr}     //we'll save the hash with the Q

            },
            addExtension : function (item,ext) {
                item.extension = item.extension || []
                item.extension.push(ext)
            },
            addExtensionOnce : function (item,ext) {
                item.extension = item.extension || []
                let canAdd = true
                for (ext1 of item.extension) {
                    if (ext1.url == ext.url) {
                        canAdd = false
                        break
                    }
                }
                if (canAdd) {
                    item.extension.push(ext)
                }



            },
            checkParentalHash : function (hash,path) {
                //ensure that all segments in the path have an entry in the hash
                //and that the 'parent' path (one less segment) has a .item that references the entry
                let ar = path.split('.')

               // let first = ar.splice(0,1)      //remove the first segment
                //ar.splice(ar.length-1,1)        //and we don't need the last segment (it's the one we're cheching the parent for)...
                let first = ar[0]
                hash[first] = hash[first] || {}

                for (let i = 1;i < ar.length -1; i++) {
                    let path = makePath(ar,i)
                    if (! hash[path]) {
                        hash[path] = {placeHolder:true,linkId:path}
                        let parentPath = makePath(ar,i-1)

                        hash[parentPath].item = hash[parentPath].item || []
                        let t = hash[parentPath]
                        hash[parentPath].item.push(t)

                        //console.log(`added ${path}`)
                    }

                }
/*
                let pathSoFar = first[0]
                for (const segment of ar) {
                    //will start with the second segment
                    if (! hash[pathSoFar]) {
                        hash[pathSoFar] = {placeHolder:true,linkId:pathSoFar}
                        console.log(`added ${pathSoFar}`)
                    }
                    pathSoFar += '.' + segment
                }
*/
                function makePath(ar,length) {
                    let path = ""
                    for (let i = 0;i < length; i++) {
                        path += `.${ar[i]}`
                    }

                    return path.substring(1)   //split off the leading '.'

                }

            },
            makeDisplayItem : function (display,extHTMLRender) {
                if (display) {
                    let item = {type:'display',text:display}
                    item.linkId = utilsSvc.getUUID()
                    let disp = `<em style='padding-left:8px'>${display}</em>`
                    item.extension = [{url:extHTMLRender,valueString:disp}]
                    return item
                }

            },
            getPathToItem : function (Q,item) {
                //h=given an

            },
            makeVariableUsage : function(Q) {
                //generate a has summary of variable expression use
                let hashVariable = {}    //defined variables (expressions have a name)
                let hashUsed = {}       //where a variable has been used
                let lstUseExpression = []   //items that use an expression
                function processItem(item) {
                    if (item.extension) {
                        let clone = angular.copy(item)
                        if (clone.item) {
                            clone.item = []
                        }
                        for (const ext of item.extension) {

                            let url = ext.url

                            if (url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId") {
                                let aName = ext.valueString
                                hashVariable[aName] = hashVariable[aName] || []

                                let thing = {kind:'allocateId',item:clone}
                                hashVariable[aName].push(thing)      //should only be 1...
                            } else if (url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue") {
                                //find the expression
                                if (ext.extension) {
                                   for (const child of ext.extension) {
                                       if (child.url == 'expression') {
                                           if (child.valueExpression) {
                                               let aName = child.valueExpression.expression

                                               hashUsed[aName] = hashUsed[aName] || []

                                               let thing = {kind:'definitionExtractValue',item:clone}
                                               hashUsed[aName].push(thing)
                                           }
                                       }
                                   }
                                }



                            } else if (ext.valueExpression) {
                                let name = ext.valueExpression.name
                                let expression = utilsSvc.getExpression(ext.valueExpression)
                                //if there's a name, then this extension is defining the variable

                                if (name) {
                                    hashVariable[name] = hashVariable[name] || []

                                    let thing = {kind:'variable',url:url,expression:ext.valueExpression.expression,item:clone}
                                    hashVariable[name].push(thing)      //should only be 1...
                                } else {
                                    //if there's no name, then it may be using a variable

                                    //look for a variable - prefixed by %
                                    const matches = expression.match(/%\w+/g)
                                    if (matches) {
                                        for (const v of matches) {
                                            hashUsed[v] = hashUsed[v] || []
                                            let thing = {url:url,expression:ext.valueExpression.expression,item:clone}
                                            hashUsed[v].push(thing)
                                        }
                                    } else {
                                        //if there are no variables found then it's just an item with an expression of some sort
                                        let thing = {url:url,expression:ext.valueExpression.expression,item:clone}
                                        lstUseExpression.push(thing)
                                    }
                                }
                            } else if (ext.extension) {
                                //this is a complex extension
                                for (const extChild of ext.extension) {
                                    if (extChild.valueExpression) {
                                        //we'll ignore any name - don't think they're useful
                                        let childExpression = utilsSvc.getExpression(extChild.valueExpression)
                                        if (childExpression) {
                                            //look for a variable - prefixed by %
                                            const childMatches = childExpression.match(/%\w+/g)
                                            if (childMatches) {
                                                for (const v of childMatches) {
                                                    hashUsed[v] = hashUsed[v] || []
                                                    let thing = {url:url,expression:childExpression,item:clone}
                                                    hashUsed[v].push(thing)
                                                }
                                            } else {
                                                //if there are no variables found then it's just an item with an expression of some sort
                                                let thing = {url:url,expression:utilsSvc.getExpression(ext.valueExpression),item:clone}
                                                lstUseExpression.push(thing)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }

                }


                processItem(Q)      //extensions defined on the root
/*
                for (const item of Q.item) {
                    processItem(item)   //item based extensions
                }
                */

                console.log(hashVariable,hashUsed,lstUseExpression)

                return {variables:hashVariable,used:hashUsed,lstUseExpression:lstUseExpression}


            }


        }

    })