from aws_cdk import (
    Stack,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager,
    Duration,
)
from constructs import Construct
from cdk_nag import NagSuppressions
from aws_cdk import CfnOutput


class DatabaseStack(Stack):
    @property
    def db_instance(self):
        return self._db_instance

    @property
    def db_sg(self):
        return self._db_instance.connections.security_groups[0]

    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc,subnet_group , **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        db_secret = secretsmanager.Secret(self, "PupperDBSecret",
                                          generate_secret_string=secretsmanager.SecretStringGenerator(
                                              secret_string_template='{"username":"pupperadmin"}',
                                              generate_string_key="password",
                                              exclude_punctuation=True,
                                              exclude_characters=" %+~`#$&*()|[]{}:;<>?!'/\"\\",
                                              password_length=32
                                          ))


        # Create RDS PostgreSQL instance (Free Tier) for
        self._db_instance = rds.DatabaseInstance(self, "PupperPostgresInstance",
                                                 engine=rds.DatabaseInstanceEngine.postgres(
                                                     version=rds.PostgresEngineVersion.VER_16_9
                                                 ),
                                                 vpc=vpc,
                                                 subnet_group=subnet_group,
                                                 credentials=rds.Credentials.from_secret(db_secret),
                                                 instance_type=ec2.InstanceType.of(
                                                     ec2.InstanceClass.BURSTABLE3,
                                                     ec2.InstanceSize.MICRO
                                                 ),
                                                 allocated_storage=20,
                                                 max_allocated_storage=100,
                                                 multi_az=False,
                                                 publicly_accessible=False,
                                                 deletion_protection=True,
                                                 storage_encrypted=True,
                                                 backup_retention=Duration.days(7),
                                                 database_name="pupperdb"
                                                 )
        # self.db_sg.add_ingress_rule(
        #     peer=ec2.Peer.ipv4("0.0.0.0/0"),
        #     connection=ec2.Port.tcp(5432),
        #     description="Allow Lambda to connect to PostgreSQL"
        # )
        # CDK Nag RDS11 finding with justification
        NagSuppressions.add_resource_suppressions(
            self.db_instance,
            suppressions=[
                {
                    "id": "AwsSolutions-RDS3",
                    "reason": "Multi-AZ is disabled for development environment to reduce costs."
                },
                {
                    "id": "AwsSolutions-RDS11",
                    "reason": "Using default Postgres port 5432 as standard for RDS PostgreSQL."
                }
            ]
        )
        # Enable rotation every 30 days
        self._db_instance.add_rotation_single_user(automatically_after=Duration.days(30))
        # Output DB endpoint
        CfnOutput(self, "PupperDBInstanceEndpoint", value=self._db_instance.db_instance_endpoint_address)
        CfnOutput(self, "PupperDBSecretArn", value=db_secret.secret_arn)
