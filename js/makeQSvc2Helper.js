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


        function hideItem(item) {
            //create a hidden extension and add to the item
            let ext = {url:extHidden,valueBoolean:true}
            addExtension(item,ext)

        }

        function addExtension(item,ext) {
            item.extension = item.extension || []
            item.extension.push(ext)
        }

        function processCC(item,ed) {
            //console.log('fixed',ed.fixedCoding)
            if (ed.fixedCoding) {
                //the definition must be to the .coding - even if category is multiple
                let concept = ed.fixedCoding
                delete concept.fsn
                item.initial = [{valueCoding:concept}]
                hideItem(item)

            }

        }

        function processCode(item,ed) {
            if (ed.fixedCode) {
                item.initial = [{valueString:ed.fixedCode}]
                hideItem(item)

            }
        }

        return {

            getControlDetails : function(ed){



                let containedDG = null

                //return the control type & hint based on the ed
                let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
                let controlType = "string"          //this has to be one of the defined type values

                if (ed.options && ed.options.length > 0) {
                    controlHint = "drop-down"
                    controlType = "choice"
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