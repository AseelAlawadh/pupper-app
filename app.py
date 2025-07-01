#!/usr/bin/env python3

import aws_cdk as cdk

from cdk_pupper.cdk_pupper_stack import CdkPupperStack


app = cdk.App()
CdkPupperStack(app, "CdkPupperStack")

app.synth()
