angular.module("pocApp")

    .service('validatorSvc', function($q,$http) {

        let validationServer = "https://fhir.forms-lab.com"

        return {
            validate: function (resource) {
                let deferred = $q.defer()
                let oo = null
                let type = resource.resourceType
                let qry = `${validationServer}/${type}/$validate`
                $http.post(qry,resource).then(
                    function (data) {
                        oo = data.data

                        for (const iss of oo.issue || []) {
                            if (iss.expression) {
                                let expression = iss.expression[0]


                                //get the actual issue based on the expression
                                let result = fhirpath.evaluate(resource, expression,null,fhirpath_r4_model);
                                //console.log(expression,result)
                                iss.issDetail = result[0]

                                //now get the containing item
                                let ar = expression.split('.')
                                if (ar.length > 2) {        //if issue on Q root then length is 2
                                    ar.pop()
                                    let itemExpression = ar.join('.')
                                    let arItem = fhirpath.evaluate(resource, itemExpression,null,fhirpath_r4_model);
                                    if (arItem) {
                                        let item = arItem[0]
                                        delete item.item        //don't want child items in the view

                                        //copy the item to the issue for easier rendering...
                                        iss.item = item
                                    }

                                    //console.log(itemExpression,item)
                                }




                            }



                        }

                        deferred.resolve({OO:oo})


                    },function (err) {
                        alert(angular.toJson(err))
                        deferred.reject(err.data)
                    }
                )

                return deferred.promise


            }
        }
    })