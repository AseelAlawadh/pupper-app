from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    RemovalPolicy,
    aws_iam as iam,
    aws_route53 as route53,
    aws_route53_targets as targets,
    CfnOutput
)

from constructs import Construct


class FrontendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create S3 bucket for hosting with BLOCK_ALL public access
        website_bucket = s3.Bucket(self, "PupperFrontendBucket",
                                   website_index_document="index.html",
                                   removal_policy=RemovalPolicy.DESTROY,
                                   auto_delete_objects=True,
                                   block_public_access=s3.BlockPublicAccess.BLOCK_ALL
                                   )

        # Create Origin Access Identity for CloudFront
        oai = cloudfront.OriginAccessIdentity(self, "PupperOAI")

        # Grant CloudFront read access to the bucket
        website_bucket.grant_read(oai)

        # website_bucket.add_to_resource_policy(
        #     iam.PolicyStatement(
        #         actions=["s3:GetObject"],
        #         resources=[website_bucket.arn_for_objects("*")],
        #         principals=[cloudfront.OriginAccessIdentity.from_origin_access_identity_name(self, "OAIName",
        #                                                                                      oai.origin_access_identity_name).grant_principal]
        #     )
        # )

        # CloudFront distribution using the OAI
        distribution = cloudfront.CloudFrontWebDistribution(self, "PupperFrontendDistribution",
                                                            origin_configs=[
                                                                cloudfront.SourceConfiguration(
                                                                    s3_origin_source=cloudfront.S3OriginConfig(
                                                                        s3_bucket_source=website_bucket,
                                                                        origin_access_identity=oai
                                                                    ),
                                                                    behaviors=[
                                                                        cloudfront.Behavior(is_default_behavior=True)]
                                                                )
                                                            ],
                                                            default_root_object="index.html",
                                                            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                                                            error_configurations=[
                                                                cloudfront.CfnDistribution.CustomErrorResponseProperty(
                                                                    error_code=404,
                                                                    response_code=200,
                                                                    response_page_path="/index.html",
                                                                    error_caching_min_ttl=0
                                                                )
                                                            ]
                                                            )

        # Deploy built frontend to S3
        deployment = s3deploy.BucketDeployment(self, "DeployFrontend",
                                               sources=[s3deploy.Source.asset("pupper-frontend/dist")],
                                               destination_bucket=website_bucket,
                                               distribution=distribution,
                                               distribution_paths=["/*"]
                                               )

        # Output CloudFront URL

        # hosted_zone = route53.HostedZone.from_lookup(self, "HostedZone",
        #                                              domain_name="pupper.app.com")  # replace with your domain
        # route53.ARecord(self, "AliasRecord",
        #                 zone=hosted_zone,
        #                 target=route53.RecordTarget.from_alias(targets.CloudFrontTarget(distribution)),
        #                 record_name="app"  # creates app.myapp.com, change as needed
        #                 )
        CfnOutput(self, "CloudFrontURL", value=f"https://{distribution.distribution_domain_name}")
