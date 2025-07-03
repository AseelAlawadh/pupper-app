from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_logs as logs,
    aws_rds as rds,
)
from constructs import Construct


class NetworkStack(Stack):

    @property
    def db_subnet_group(self):
        return self._db_subnet_group

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Create VPC
        self.vpc = ec2.Vpc(self, "PupperVpc",
                           max_azs=2,
                           nat_gateways=1,
                           subnet_configuration=[
                               ec2.SubnetConfiguration(
                                   name="PupperPublicSubnet",
                                   subnet_type=ec2.SubnetType.PUBLIC,
                                   cidr_mask=24,
                               ),
                               ec2.SubnetConfiguration(
                                   name="PupperPrivateSubnet",
                                   subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                                   cidr_mask=24,
                               )
                           ]
                           )

        # Create DB subnet group
        self._db_subnet_group = rds.SubnetGroup(
            self,
            "DbSubnetGroup",
            description="Subnet group for RDS database",
            vpc=self.vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            )
        )

        # Add Flow Log to CloudWatch Logs
        log_group = logs.LogGroup(self, "PupperVpcFlowLogs")

        ec2.FlowLog(self, "VpcFlowLog",
                    resource_type=ec2.FlowLogResourceType.from_vpc(self.vpc),
                    destination=ec2.FlowLogDestination.to_cloud_watch_logs(log_group)
                    )
