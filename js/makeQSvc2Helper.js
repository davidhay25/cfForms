angular.module('pocApp')
    .service('makeQSvc2Helper', function (snapshotSvc) {


        let extDefinitionExtractValue = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue"

        function makeDisplayItemDEP(display,extHTMLRender) {
            if (display) {
                let item = {type:'display',text:display}
                item.linkId = utilsSvc.getUUID()
                let disp = `<em style='padding-left:8px'>${display}</em>`
                item.extension = [{url:extHTMLRender,valueString:disp}]
                return item
            }

        }

        function addFixedValue(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression
            //definition is the path in the resource (added to the 'item.definition' value


            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extDefinitionExtractValue,extension:[]}
            ext.extension.push({url:"definition",valueUri:definition})

            if (value) {
                let child = {url:'fixed-value'}
                child[`value${type}`] = value

                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child.valueExpression = {language:"text/fhirpath",expression:expression}
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }


        function hideItem(ed,item) {
            //create a hidden extension and add to the item
            let ext = {url:extHidden,valueBoolean:true}
            addExtension(item,ext)

        }

        function addExtension(item,ext) {

            item.extension = item.extension || []
            item.extension.push(ext)
        }

        function processCC(item,ed) {
            //fixed values are only used in extraction and need to be added to the parent (which I don't have here)
            //for now, just add an adhoc extension for fixed values
            if (false && ed.fixedCoding && ed.definition) {
                //
                /*

                let definition = `http://hl7.org/fhir/StructureDefinition/Observation#${ed.definition}`

                //let definition = `http://hl7.org/fhir/StructureDefinition/Observation#Observation.status`
                let cc = {coding:[ed.fixedCoding]}
                addFixedValue(item, definition, 'CodeableConcept', cc)

*/
            }

            if (ed.defaultCoding) {
                //the definition must be to the .coding - even if category is multiple
                let concept = ed.defaultCoding
                delete concept.fsn


                //it seems that just setting initial doesn't work - and we can't have initial & answerOption
                let addConcept = true
                item.answerOption = item.answerOption || []
                for (let opt of item.answerOption) {
                    if (opt.valueCoding.code == concept.code && opt.valueCoding.system == concept.system) {
                        opt.initialSelected = true
                        addConcept = false
                        break
                    }
                }

                if (addConcept) {

                    item.answerOption.push({valueCoding:concept,initialSelected:true})
                }



               // item.initial = [{valueCoding:concept}]

            }

        }

        function processCode(item,ed) {
            if (ed.fixedCode) {


                /* a fixed code needs more thought. initial doesn't work, nor does setting a fixed value.

                really needs to be attached to the 'parent' - eg works from when setting Observation.ststus

                May be best not to have it on the item at all, but an


                if (ed.definition) {
                    let ar = ed.definition.split('.')
                    let type = ar[0]        //the expression always starts with the type - eg Patient.name.given


                    let ext = {url: extInitialExpressionUrl}
                    ext.valueExpression = {language: "text/fhirpath", expression: `${ed.prePop}`}
                    item.extension = item.extension || []
                    item.extension.push(ext)




                    let canonical = `http://hl7.org/fhir/StructureDefinition/${type}#${ed.definition}`
                    addFixedValue(item,canonical,'Code',ed.fixedCode)
                    delete item.definition
                    hideItem(item)

                }


*/


               // item.initial = [{valueString:ed.fixedCode}]
                //item.answerOption = [{valueString:ed.fixedCode}]


                // don't automatically hide hideItem(item)

            }
        }

        return {

            findDuplicateLinkIds : function (Q) {
                let hashLinkId = {}

                function processItem(item) {
                    hashLinkId[item.linkId] = hashLinkId[item.linkId] || []
                    hashLinkId[item.linkId].push()


                }

            },

            checkForHtml : function (ed,item) {
                //if the ed has htmlDisplay or is html (crude - has both > and < ) if so, add the rendering-xhtml extension
                //to the item.text element

                let title = ed.title
                if (ed.htmlDisplay ||  title?.indexOf('>') > -1 && title?.indexOf('>') > -1) {
                    let html = ed.htmlDisplay || title
                    item["_text"] = item["_text"] || {}
                    item["_text"].extension = []


                    let ext = {url:"http://hl7.org/fhir/StructureDefinition/rendering-xhtml"}
                    ext.valueString = html
                    item["_text"].extension.push(ext)

                }

            },

            getControlDetails : function(ed){



                let containedDG = null

                //return the control type & hint based on the ed
                let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
                let controlType = "string"          //this has to be one of the defined type values

                if (ed.options && ed.options.length > 0) {
                    controlHint = "drop-down"
                    controlType = "choice"
                    //controlType = "open-choice"
                }

                if (ed.type) {
                    let type = ed.type[0]

                    containedDG = snapshotSvc.getDG(ed.type[0])
                    if (containedDG) {
                        //this is a contained DG
                        controlHint = "group"
                        controlType = "group"
                    } else {
                        switch (type) {
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
                            case 'code' :
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

                                controlHint = "group"
                                controlType = "group"

                                break
                            /*
                            case 'Identifier' :
                                controlHint = "Identifier"
                                controlType = "Identifier"
        */

                        }

                    }
                }


                return {controlType:controlType,controlHint:controlHint,dg:containedDG}
            },

            addFixedValue : addFixedValue,
            addExtension : addExtension,
            hideItem:hideItem,
            typeSpecificProcessing: function (item,ed) {
                //specific processing based on the data type - like fixed values, defaults etc
                if (! ed.type) {return }
                let type = ed.type[0]
                //console.log(type)
                switch (type) {
                    case "CodeableConcept" :
                        processCC(item,ed)
                        break
                    case "code" :
                        processCode(item,ed)
                        break

                }

            },
            miscProcessing : function (item,ed) {
                if (ed.itemCode) {
                    //
                }

            }
        }

    } )