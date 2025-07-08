# backend_stack.py

from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigatewayv2 as apigw,
    aws_iam as iam,
    aws_apigatewayv2_integrations as integrations,
    aws_ec2 as ec2,
    aws_logs as logs,
    Duration,
    CfnOutput,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class BackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, vpc, buckets, db_instance, lambda_sg, **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        # Lambda Layer with FastAPI + Mangum + dependencies
        fastapi_layer = _lambda.LayerVersion(self, "FastAPILayer",
                                             code=_lambda.Code.from_asset("fastapi_layer.zip"),
                                             compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
                                             description="Layer with FastAPI and Mangum dependencies")

        # lambda_sg = ec2.SecurityGroup(self, "LambdaSG",
        #                               vpc=vpc,
        #                               description="Lambda security group",
        #                               allow_all_outbound=True)

        # db_sg.add_ingress_rule(
        #     peer=lambda_sg,
        #     connection=ec2.Port.tcp(5432),
        #     description="Allow Lambda to connect to PostgreSQL"
        # )
        # Lambda function for FastAPI backend
        backend_lambda = _lambda.Function(self, "PupperBackendLambda",
                                          runtime=_lambda.Runtime.PYTHON_3_12,
                                          handler="main.handler",
                                          code=_lambda.Code.from_asset("backend/app"),
                                          layers=[fastapi_layer],
                                          memory_size=512,
                                          timeout=Duration.seconds(120),
                                          environment={
                                              "DB_SECRET_ARN": db_instance.secret.secret_arn,
                                              "DB_HOST": db_instance.db_instance_endpoint_address,
                                              "BUCKET_NAME": buckets["original"].bucket_name,
                                              "FERNET_KEY": "H_2p9clY89N59AsHb-faCsZ1z4qng-0f9xj1eN8nDgE="

                                          },
                                          vpc=vpc,
                                          vpc_subnets=ec2.SubnetSelection(
                                              subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
                                          ),
                                          security_groups=[lambda_sg],
                                          )

        # backend_lambda.connections.allow_from(db_sg, ec2.Port.tcp(5432))

        backend_lambda.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "rds-db:connect"
                ],
                resources=[
                    f"arn:aws:rds-db:{self.region}:{self.account}:dbuser:*/postgres"
                ]
            )
        )
        backend_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=["arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-7-sonnet-20250219-v1:0"]
            )
        )

        # Permissions
        db_instance.secret.grant_read(backend_lambda)
        buckets["original"].grant_read_write(backend_lambda)
        # API Gateway HTTP API
        log_group = logs.LogGroup(self, "PupperApiLogs")

        http_api = apigw.HttpApi(self, "PupperHttpApi",
                                 default_integration=integrations.HttpLambdaIntegration(
                                     "PupperHttpLambdaIntegration",
                                     handler=backend_lambda
                                 ))
        # Output API Gateway endpoint URL
        CfnOutput(self, "PupperHttpApiUrl", value=http_api.api_endpoint)

        # migration_lambda = _lambda.Function(
        #     self, "PupperMigrationLambda",
        #     runtime=_lambda.Runtime.PYTHON_3_12,
        #     handler="main.handler",
        #     code=_lambda.Code.from_asset("backend/migrations"),
        #     layers=[fastapi_layer],
        #     vpc=vpc,
        #     vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
        #     security_groups=[lambda_sg],
        #     environment={
        #         "DB_SECRET_ARN": db_instance.secret.secret_arn,
        #         "DB_HOST": db_instance.db_instance_endpoint_address,
        #     },
        #     timeout=Duration.seconds(60),
        #     memory_size=256,
        # )
        # db_instance.secret.grant_read(migration_lambda)
        # Suppressions for Lambda role
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
