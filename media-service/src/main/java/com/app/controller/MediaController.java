package com.app.controller;

import com.app.service.LocalStorageService;
import com.app.service.S3StorageService;
import com.app.service.StorageService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/media")
public class MediaController {

    @Autowired
    private LocalStorageService localStorage;

    @Autowired(required = false)
    private S3StorageService s3Storage;

    @Value("${STORAGE_PATH:/app/media}")
    private String uploadDir;

    @PostMapping("/upload")
    public String upload(@RequestParam MultipartFile file) throws Exception {

        String storageType = System.getenv("STORAGE_TYPE");

        StorageService service;

        if("s3".equalsIgnoreCase(storageType)) {
            service = s3Storage;
        } else {
            service = localStorage;
        }

        return service.store(file);
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> getMedia(@PathVariable String filename) throws Exception {
        Path filePath = Paths.get(uploadDir).resolve(filename);
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        String contentType = "application/octet-stream";
        String lowerFilename = filename.toLowerCase();
        if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            contentType = "image/jpeg";
        } else if (lowerFilename.endsWith(".png")) {
            contentType = "image/png";
        } else if (lowerFilename.endsWith(".gif")) {
            contentType = "image/gif";
        } else if (lowerFilename.endsWith(".webp")) {
            contentType = "image/webp";
        } else if (lowerFilename.endsWith(".mp4")) {
            contentType = "video/mp4";
        } else if (lowerFilename.endsWith(".webm")) {
            contentType = "video/webm";
        } else if (lowerFilename.endsWith(".ogg")) {
            contentType = "video/ogg";
        } else if (lowerFilename.endsWith(".mov")) {
            contentType = "video/quicktime";
        } else if (lowerFilename.endsWith(".avi")) {
            contentType = "video/x-msvideo";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}