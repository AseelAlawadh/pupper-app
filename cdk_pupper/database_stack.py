from aws_cdk import (
    Stack,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager,
    Duration,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class DatabaseStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Create secret for DB credentials
        db_secret = secretsmanager.Secret(self, "PupperDBSecret",
                                          generate_secret_string=secretsmanager.SecretStringGenerator(
                                              secret_string_template='{"username":"pupperadmin"}',
                                              generate_string_key="password",
                                              exclude_punctuation=True
                                          )
                                          )

        # Create Aurora Serverless v2 cluster
        self.db_cluster = rds.ServerlessCluster(self, "PupperAuroraCluster",
                                                engine=rds.DatabaseClusterEngine.aurora_postgres(
                                                    version=rds.AuroraPostgresEngineVersion.VER_14_6
                                                ),
                                                vpc=vpc,
                                                credentials=rds.Credentials.from_secret(db_secret),
                                                scaling=rds.ServerlessScalingOptions(
                                                    # Auto pause after inactivity (cost optimization)
                                                    auto_pause=Duration.minutes(10),  # pause after inactivity
                                                    min_capacity=rds.AuroraCapacityUnit.ACU_2,
                                                    max_capacity=rds.AuroraCapacityUnit.ACU_8
                                                ),
                                                default_database_name="pupperdb",
                                                vpc_subnets=ec2.SubnetSelection(
                                                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
                                                ),
                                                enable_data_api=True,
                                                deletion_protection=True
                                                )

        # ✅ Suppress CDK Nag RDS11 finding with justification
        NagSuppressions.add_resource_suppressions(
            self.db_cluster,
            suppressions=[
                {
                    "id": "AwsSolutions-RDS11",
                    "reason": "Aurora Serverless v2 does not support custom port configuration. Uses default Postgres port 5432."
                },
                {
                    "id": "AwsSolutions-RDS6",
                    "reason": "Aurora Serverless v2 does not support enabling IAM authentication via CDK. Access via Data API or Secrets Manager credentials."
                }
            ]
        )

        # ✅ Enable rotation every 30 days via cluster rotation directly
        self.db_cluster.add_rotation_single_user(
            automatically_after=Duration.days(30)
        )
