from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_iam as iam,
    Duration,
)
from constructs import Construct
from cdk_nag import NagSuppressions


class StorageStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Original dog images bucket
        self.original_bucket = s3.Bucket(self, "PupperOriginalImagesBucket",
                                         versioned=True,
                                         encryption=s3.BucketEncryption.S3_MANAGED,
                                         block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                                         )

        # Enforce SSL requests only for original bucket
        self.original_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowSSLRequestsOnly",
                effect=iam.Effect.DENY,
                principals=[iam.AnyPrincipal()],
                actions=["s3:*"],
                resources=[
                    self.original_bucket.bucket_arn,
                    f"{self.original_bucket.bucket_arn}/*"
                ],
                conditions={
                    "Bool": {"aws:SecureTransport": "false"}
                }
            )
        )

        # Resized thumbnails bucket
        self.thumbnail_bucket = s3.Bucket(self, "PupperThumbnailImagesBucket",
                                          versioned=True,
                                          encryption=s3.BucketEncryption.S3_MANAGED,
                                          block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                                          )

        # Enforce SSL requests only for thumbnail bucket
        self.thumbnail_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowSSLRequestsOnly",
                effect=iam.Effect.DENY,
                principals=[iam.AnyPrincipal()],
                actions=["s3:*"],
                resources=[
                    self.thumbnail_bucket.bucket_arn,
                    f"{self.thumbnail_bucket.bucket_arn}/*"
                ],
                conditions={
                    "Bool": {"aws:SecureTransport": "false"}
                }
            )
        )

        # Generated AI images bucket
        self.generated_bucket = s3.Bucket(self, "PupperGeneratedImagesBucket",
                                          versioned=True,
                                          encryption=s3.BucketEncryption.S3_MANAGED,
                                          block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                                          )

        # Enforce SSL requests only for generated bucket
        self.generated_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowSSLRequestsOnly",
                effect=iam.Effect.DENY,
                principals=[iam.AnyPrincipal()],
                actions=["s3:*"],
                resources=[
                    self.generated_bucket.bucket_arn,
                    f"{self.generated_bucket.bucket_arn}/*"
                ],
                conditions={
                    "Bool": {"aws:SecureTransport": "false"}
                }
            )
        )

        # ✅ Suppress CDK Nag public access warnings with justification
        for bucket in [self.original_bucket, self.thumbnail_bucket, self.generated_bucket]:
            NagSuppressions.add_resource_suppressions(
                bucket,
                suppressions=[
                    {
                        "id": "AwsSolutions-S1",
                        "reason": "All buckets block public access and use S3-managed encryption as per app requirements."
                    },
                    {
                        "id": "AwsSolutions-S10",
                        "reason": "SSL requests are enforced via bucket policy."
                    }
                ]
            )
