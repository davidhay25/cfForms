angular.module('pocApp')
    .service('makeQSvc2Helper', function () {



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