package com.acme.backend.config;

import com.acme.backend.domain.ThermalImage;
import com.acme.backend.domain.Transformer;
import com.acme.backend.repo.ThermalImageRepo;
import com.acme.backend.repo.TransformerRepo;
import com.acme.backend.storage.FileStorageService;
import com.acme.backend.util.SimpleMultipartFile;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(TransformerRepo transformerRepo,
                           ThermalImageRepo imageRepo,
                           FileStorageService storage) {
        return args -> {
            if (transformerRepo.count() > 0) return;

            // Create 5 transformers
            var t1 = make(transformerRepo, "TX-001", "Thannekumbura",   500, "Kandy",    "EN-122-A", "Bulk",         "Near substation");
            var t2 = make(transformerRepo, "TX-002", "Hettipola", 300, "Matale",    "EN-122-B", "Distribution", "");
            var t3 = make(transformerRepo, "TX-003", "Kuliyapitiya",  200, "Kurunagala", "EN-123-A", "Bulk",         "");
            var t4 = make(transformerRepo, "TX-004", "Nugegoda",   400, "Colombo",   "EN-124-B", "Distribution", "");
            var t5 = make(transformerRepo, "TX-005", "Mahiyanganaya",  250, "Badulla",   "EN-125-A", "Bulk",         "");
            var transformers = List.of(t1, t2, t3, t4, t5);

            // Load all images under classpath:seed-images/*.jpg|jpeg|png
            var resolver = new PathMatchingResourcePatternResolver();
            var images = new ArrayList<Resource>();
            for (var pattern : List.of("classpath:seed-images/*.jpg",
                    "classpath:seed-images/*.jpeg",
                    "classpath:seed-images/*.png")) {
                try {
                    for (Resource r : resolver.getResources(pattern)) if (r != null && r.exists()) images.add(r);
                } catch (Exception ignored) {}
            }
            images.sort(Comparator.comparing(r -> {
                try { return r.getFilename(); } catch (Exception e) { return ""; }
            }));

            // Attach first N images to N transformers as BASELINE (SUNNY)
            int n = Math.min(images.size(), transformers.size());
            for (int i = 0; i < n; i++) {
                attachBaseline(transformers.get(i), images.get(i), imageRepo, storage);
            }
        };
    }

    private Transformer make(TransformerRepo repo, String code, String location, int kva,
                             String region, String poleNo, String type, String details) {
        var t = new Transformer();
        t.setCode(code); t.setLocation(location); t.setCapacityKVA(kva);
        t.setRegion(region); t.setPoleNo(poleNo); t.setType(type); t.setLocationDetails(details);
        return repo.save(t);
    }

    private void attachBaseline(Transformer t, Resource res,
                                ThermalImageRepo imageRepo, FileStorageService storage) {
        try (InputStream is = res.getInputStream()) {
            String original = res.getFilename() != null ? res.getFilename() : "seed";
            String contentType = original.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
            byte[] data = is.readAllBytes();

            MultipartFile mf = new SimpleMultipartFile(original, original, contentType, data);

            // your storage signature: (UUID transformerId, String type, MultipartFile file)
            var stored = storage.store(t.getId(), "BASELINE", mf);

            var img = new ThermalImage();
            img.setTransformer(t);
            img.setType(ThermalImage.Type.BASELINE);
            img.setEnvCondition(ThermalImage.EnvCondition.SUNNY);
            img.setOriginalFilename(original);
            img.setStoredFilename(stored.storedName());
            img.setContentType(stored.contentType());
            img.setSizeBytes(stored.size());
            img.setUploader("seed");
            img.setPublicUrl(stored.publicUrl());
            imageRepo.save(img);
        } catch (Exception e) {
            // seeding is best-effort; don't block startup
            e.printStackTrace();
        }
    }
}