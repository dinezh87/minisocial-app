package com.app.service;

import com.amazonaws.services.s3.AmazonS3;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@ConditionalOnProperty(name = "STORAGE_TYPE", havingValue = "s3")
public class S3StorageService implements StorageService {

    @Autowired
    private AmazonS3 s3;

    @Value("${S3_BUCKET}")
    private String bucket;

    @Override
    public String store(MultipartFile file) throws Exception {
        String originalName = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
        String name = UUID.randomUUID() + "_" + originalName.replaceAll("\\s+", "_");

        s3.putObject(bucket, name, file.getInputStream(), null);

        return s3.getUrl(bucket, name).toString();
    }

    public String resolveUrl(String filename) {
        return s3.getUrl(bucket, filename).toString();
    }
}
