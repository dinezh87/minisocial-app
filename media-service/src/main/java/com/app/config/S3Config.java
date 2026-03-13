package com.app.config;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "STORAGE_TYPE", havingValue = "s3")
public class S3Config {

    @Bean
    public AmazonS3 amazonS3(@Value("${AWS_REGION:us-east-1}") String region) {
        return AmazonS3ClientBuilder.standard()
                .withRegion(Regions.fromName(region))
                .withCredentials(DefaultAWSCredentialsProviderChain.getInstance())
                .build();
    }
}
