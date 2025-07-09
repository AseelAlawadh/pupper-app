import aws_cdk as core
import aws_cdk.assertions as assertions
from cdk_pupper.backend_stack import BackendStack
from cdk_pupper.database_stack import DatabaseStack

def test_backend_stack_created():
    app = core.App()
    stack = BackendStack(app, "test-backend", vpc=None, buckets={}, db_instance=None, lambda_sg=None)
    template = assertions.Template.from_stack(stack)
    
    # Test Lambda function exists
    template.has_resource_properties("AWS::Lambda::Function", {
        "Runtime": "python3.12"
    })

def test_database_stack_created():
    app = core.App()
    stack = DatabaseStack(app, "test-database", vpc=None)
    template = assertions.Template.from_stack(stack)
    
    # Test RDS instance exists
    template.has_resource_properties("AWS::RDS::DBInstance", {
        "Engine": "postgres"
    })