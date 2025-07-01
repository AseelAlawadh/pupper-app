#!/usr/bin/env python3

import aws_cdk as cdk
from cdk_nag import AwsSolutionsChecks
from cdk_pupper.cdk_pupper_stack import CdkPupperStack
from cdk_pupper.database_stack import DatabaseStack
from cdk_pupper.network_stack import NetworkStack
from cdk_pupper.storage_stack import StorageStack

app = cdk.App()
# Apply CDK Nag compliance checks globally
cdk.Aspects.of(app).add(AwsSolutionsChecks())
# CdkPupperStack(app, "CdkPupperStack")
network_stack = NetworkStack(app, "PupperNetworkStack")
db_stack = DatabaseStack(app, "PupperDatabaseStack",
                         vpc=network_stack.vpc)
storage_stack = StorageStack(app, "PupperStorageStack")
app.synth()
