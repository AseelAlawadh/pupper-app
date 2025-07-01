#!/usr/bin/env python3

import aws_cdk as cdk
from cdk_nag import AwsSolutionsChecks
from cdk_pupper.cdk_pupper_stack import CdkPupperStack


app = cdk.App()
# Apply CDK Nag compliance checks globally
cdk.Aspects.of(app).add(AwsSolutionsChecks())
CdkPupperStack(app, "CdkPupperStack")

app.synth()
