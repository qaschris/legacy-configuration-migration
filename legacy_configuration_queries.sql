-- dump variables
select cv.id as "variableid",
       cv.name as "variable_name",
       coalesce(nullif(trim(cv.description), ''), cv.name) as "variable_description",
       cvv.id as "valueid",
       cvv.value
from configuration_variables cv
    inner join configuration_variable_values cvv
        on cv.id = cvv.variableid

-- dump configs and variable relationships
select c.id as "configurationid",
       c.name as "configuration_name",
       cv2.id as "variableid",
       cv2.name as "variable_name",
       cv1.valueid,
       cvv.value as "variable_value"
from configurations c
    inner join configuration_values cv1
        on c.id = cv1.configurationid
    inner join configuration_variable_values cvv
        on cv1.valueid = cvv.id
    inner join configuration_variables cv2
        on cvv.variableid = cv2.id

-- dump test case runs
select tcr.id as "testrunid",
       tcr.name as "testrun_name",
       c.id as "configurationid",
       c.name as "configuration_name"
from test_case_run tcr
    inner join configurations c
        on c.id = tcr.configurationid

select * from test_case_run where id < 20