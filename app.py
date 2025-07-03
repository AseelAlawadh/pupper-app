#!/usr/bin/env python3

import aws_cdk as cdk
from cdk_nag import AwsSolutionsChecks

from cdk_pupper.backend_stack import BackendStack
from cdk_pupper.cdk_pupper_stack import CdkPupperStack
from cdk_pupper.database_stack import DatabaseStack
from cdk_pupper.network_stack import NetworkStack
from cdk_pupper.storage_stack import StorageStack

app = cdk.App()
# Apply CDK Nag compliance checks globally
# cdk.Aspects.of(app).add(AwsSolutionsChecks())
# CdkPupperStack(app, "CdkPupperStack")
network_stack = NetworkStack(app, "PupperNetworkStack")
db_stack = DatabaseStack(app, "PupperDatabaseStack",
                         vpc=network_stack.vpc, subnet_group= network_stack.db_subnet_group)
storage_stack = StorageStack(app, "PupperStorageStack")

backend_stack = BackendStack(app, "PupperBackendStack",
                             vpc=network_stack.vpc,
                             buckets={
                                 "original": storage_stack.original_bucket,
                                 "thumbnail": storage_stack.thumbnail_bucket,
                                 "generated": storage_stack.generated_bucket
                             },
                             db_instance=db_stack.db_instance,
                             db_sg=db_stack.db_sg
                             )
app.synth()
