from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_logs as logs,
)
from constructs import Construct


class NetworkStack(Stack):

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

        # Add Flow Log to CloudWatch Logs
        log_group = logs.LogGroup(self, "PupperVpcFlowLogs")

        ec2.FlowLog(self, "VpcFlowLog",
                    resource_type=ec2.FlowLogResourceType.from_vpc(self.vpc),
                    destination=ec2.FlowLogDestination.to_cloud_watch_logs(log_group)
                    )
