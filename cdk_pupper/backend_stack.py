from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigatewayv2 as apigw,
    aws_apigatewayv2_integrations as integrations,
    aws_logs as logs,
    Duration,
    CfnOutput,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, vpc, buckets, db_secret, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # ✅ Lambda Layer with FastAPI + Mangum + dependencies
        fastapi_layer = _lambda.LayerVersion(self, "FastAPILayer",
                                             code=_lambda.Code.from_asset("fastapi_layer.zip"),
                                             # adjusted path based on your structure
                                             compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
                                             description="Layer with FastAPI and Mangum dependencies"
                                             )

        # ✅ Lambda function for FastAPI backend
        backend_lambda = _lambda.Function(self, "PupperBackendLambda",
                                          runtime=_lambda.Runtime.PYTHON_3_12,
                                          handler="main.handler",  # Uses Mangum handler for API Gateway
                                          code=_lambda.Code.from_asset("backend/app"),
                                          # adjusted path based on your structure
                                          layers=[fastapi_layer],
                                          memory_size=512,
                                          timeout=Duration.seconds(30),
                                          environment={
                                              "DB_SECRET_ARN": db_secret.secret_arn,
                                              "BUCKET_NAME": buckets["original"].bucket_name
                                          },
                                          vpc=vpc,
                                          )

        # ✅ Permissions
        db_secret.grant_read(backend_lambda)
        buckets["original"].grant_read_write(backend_lambda)

        # ✅ API Gateway HTTP API
        log_group = logs.LogGroup(self, "PupperApiLogs")

        http_api = apigw.HttpApi(self, "PupperHttpApi",
                                 default_integration=integrations.HttpLambdaIntegration(
                                     "PupperHttpLambdaIntegration",
                                     handler=backend_lambda
                                 )
                                 )

        # ✅ Output API Gateway endpoint URL
        CfnOutput(self, "PupperHttpApiUrl", value=http_api.api_endpoint)

        # ✅ Suppressions for Lambda role
        NagSuppressions.add_resource_suppressions(
            backend_lambda.role,
            suppressions=[
                {"id": "AwsSolutions-IAM4", "reason": "Using AWS managed policies for Lambda execution role in dev."},
                {"id": "AwsSolutions-IAM5",
                 "reason": "Wildcard S3 permissions are acceptable in dev; will restrict in prod."}
            ],
            apply_to_children=True
        )

        # ✅ Suppression for Lambda runtime version
        NagSuppressions.add_resource_suppressions(
            backend_lambda,
            suppressions=[
                {"id": "AwsSolutions-L1", "reason": "Python 3.12 is the latest runtime available."}
            ]
        )

        # ✅ Suppress APIG1 (access logging) and APIG4 (authorization) on child resources
        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{self.stack_name}/PupperHttpApi/DefaultStage/Resource",
            suppressions=[
                {
                    "id": "AwsSolutions-APIG1",
                    "reason": "Access logging is disabled for dev; will enable in production."
                }
            ]
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{self.stack_name}/PupperHttpApi/DefaultRoute/Resource",
            suppressions=[
                {
                    "id": "AwsSolutions-APIG4",
                    "reason": "Authorization is not configured in dev; will integrate Cognito Authorizer in production."
                }
            ]
        )
