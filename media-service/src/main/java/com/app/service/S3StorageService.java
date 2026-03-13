package com.app.service;

import com.amazonaws.services.s3.AmazonS3;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@ConditionalOnProperty(name = "STORAGE_TYPE", havingValue = "s3")
public class S3StorageService implements StorageService {

    @Autowired
    private AmazonS3 s3;

    private String bucket = System.getenv("S3_BUCKET");

    @Override
    public String store(MultipartFile file) throws Exception {

        String name = file.getOriginalFilename();

        s3.putObject(bucket,name,file.getInputStream(),null);

        return name;
    }
}