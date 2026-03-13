package com.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class LocalStorageService implements StorageService {

    @Value("${STORAGE_PATH:/app/media}")
    private String uploadDir;

    @Value("${MEDIA_PUBLIC_BASE_URL:http://localhost:8081}")
    private String mediaPublicBaseUrl;

    @Override
    public String store(MultipartFile file) throws Exception {

        File dir = new File(uploadDir);

        if(!dir.exists()){
            dir.mkdirs();
        }

        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path path = Paths.get(uploadDir, filename);

        Files.write(path, file.getBytes());

        return mediaPublicBaseUrl + "/media/" + filename;
    }
}
