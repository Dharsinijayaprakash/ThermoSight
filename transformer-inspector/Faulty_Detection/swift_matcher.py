#!/usr/bin/env python3
"""
Swift Image Matching - High Performance Thermal Image Comparison
Uses optimized algorithms for fast similarity detection
"""

import cv2
import numpy as np
import sys
import os
import time
from pathlib import Path

class SwiftMatcher:
    def __init__(self, threshold=0.85):
        """
        Swift image matcher using optimized algorithms
        
        Args:
            threshold: Similarity threshold (0.0 to 1.0)
        """
        self.threshold = threshold
        # More robust feature detector for augmented images
        self.orb = cv2.ORB_create(nfeatures=2000, scaleFactor=1.2, nlevels=8)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        
        # SIFT detector for better keypoint detection (if available)
        try:
            self.sift = cv2.SIFT_create(nfeatures=1000)
            self.sift_available = True
        except:
            self.sift_available = False
        
    def read_and_preprocess(self, path, target_size=(512, 512)):
        """Fast image reading and preprocessing"""
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise FileNotFoundError(f"Cannot read {path}")
        
        # Resize for faster processing
        img = cv2.resize(img, target_size)
        
        # Histogram equalization for better feature detection
        img = cv2.equalizeHist(img)
        
        return img
    
    def extract_features(self, img):
        """Extract ORB features for matching"""
        keypoints, descriptors = self.orb.detectAndCompute(img, None)
        return keypoints, descriptors
    
    def histogram_comparison(self, img1, img2):
        """Improved histogram-based comparison with multiple color spaces"""
        scores = []
        
        # Original grayscale histogram
        hist1 = cv2.calcHist([img1], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([img2], [0], None, [256], [0, 256])
        
        # Normalize histograms
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        
        # Multiple comparison methods
        correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        chi_square = 1.0 / (1.0 + cv2.compareHist(hist1, hist2, cv2.HISTCMP_CHISQR))
        intersection = cv2.compareHist(hist1, hist2, cv2.HISTCMP_INTERSECT)
        
        # Robust histogram (less sensitive to brightness changes)
        # Use smaller bins to reduce sensitivity
        hist1_coarse = cv2.calcHist([img1], [0], None, [32], [0, 256])
        hist2_coarse = cv2.calcHist([img2], [0], None, [32], [0, 256])
        cv2.normalize(hist1_coarse, hist1_coarse, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2_coarse, hist2_coarse, 0, 1, cv2.NORM_MINMAX)
        
        coarse_corr = cv2.compareHist(hist1_coarse, hist2_coarse, cv2.HISTCMP_CORREL)
        
        # Combine scores (weighted average)
        final_score = (correlation * 0.4 + chi_square * 0.2 + 
                      intersection * 0.2 + coarse_corr * 0.2)
        
        return max(0, final_score)
    
    def template_matching(self, img1, img2):
        """Fast template matching with multiple scales"""
        scores = []
        
        # Try different scales
        scales = [0.8, 1.0, 1.2]
        
        for scale in scales:
            h, w = img2.shape
            new_h, new_w = int(h * scale), int(w * scale)
            
            if new_h > img1.shape[0] or new_w > img1.shape[1]:
                continue
                
            resized_template = cv2.resize(img2, (new_w, new_h))
            
            # Template matching
            result = cv2.matchTemplate(img1, resized_template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            scores.append(max_val)
        
        return max(scores) if scores else 0.0
    
    def feature_matching(self, desc1, desc2, kp1=None, kp2=None):
        """Improved feature matching with ratio test and geometric verification"""
        if desc1 is None or desc2 is None or len(desc1) < 10 or len(desc2) < 10:
            return 0.0
        
        try:
            # Use FLANN matcher for better performance
            FLANN_INDEX_KDTREE = 1
            index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
            search_params = dict(checks=50)
            flann = cv2.FlannBasedMatcher(index_params, search_params)
            
            # Get k=2 nearest neighbors for ratio test
            if len(desc1) >= 2 and len(desc2) >= 2:
                matches = flann.knnMatch(desc1, desc2, k=2)
            else:
                # Fallback to brute force matcher
                matches = self.bf.match(desc1, desc2)
                matches = sorted(matches, key=lambda x: x.distance)
                good_matches = [m for m in matches if m.distance < 50]
                if len(good_matches) > 0:
                    match_ratio = len(good_matches) / min(len(desc1), len(desc2))
                    avg_distance = np.mean([m.distance for m in good_matches])
                    return max(0, 1.0 - (avg_distance / 100.0)) * match_ratio
                return 0.0
            
            # Apply Lowe's ratio test
            good_matches = []
            for match_pair in matches:
                if len(match_pair) == 2:
                    m, n = match_pair
                    if m.distance < 0.7 * n.distance:  # Lowe's ratio test
                        good_matches.append(m)
            
            if len(good_matches) < 10:
                return 0.0
            
            # Geometric verification using homography (if enough matches)
            if len(good_matches) >= 15 and kp1 is not None and kp2 is not None:
                src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                
                # Find homography with RANSAC
                M, mask = cv2.findHomography(src_pts, dst_pts, 
                                           cv2.RANSAC, 5.0)
                
                if mask is not None:
                    inliers = np.sum(mask)
                    inlier_ratio = inliers / len(good_matches)
                    
                    # Score based on inlier ratio and number of matches
                    match_score = (inlier_ratio * 0.7 + 
                                 min(1.0, len(good_matches) / 100.0) * 0.3)
                    return match_score
            
            # Standard scoring without geometric verification
            match_ratio = len(good_matches) / min(len(desc1), len(desc2))
            avg_distance = np.mean([m.distance for m in good_matches])
            similarity = max(0, 1.0 - (avg_distance / 100.0))
            
            return similarity * match_ratio
            
        except Exception as e:
            print(f"Feature matching error: {e}")
            # Fallback to simple matching
            try:
                matches = self.bf.match(desc1, desc2)
                if len(matches) > 10:
                    matches = sorted(matches, key=lambda x: x.distance)
                    good_matches = matches[:min(50, len(matches)//2)]
                    avg_distance = np.mean([m.distance for m in good_matches])
                    return max(0, 1.0 - (avg_distance / 100.0))
            except:
                pass
            return 0.0
    
    def phase_correlation(self, img1, img2):
        """Phase correlation for translation detection"""
        try:
            # Convert to float32
            f1 = img1.astype(np.float32)
            f2 = img2.astype(np.float32)
            
            # FFT
            F1 = np.fft.fft2(f1)
            F2 = np.fft.fft2(f2)
            
            # Phase correlation
            R = (F1 * np.conj(F2)) / (np.abs(F1 * np.conj(F2)) + 1e-10)
            r = np.fft.ifft2(R).real
            
            # Find peak
            peak = np.max(r)
            return min(1.0, peak)
            
        except Exception:
            return 0.0
    
    def augmentation_robust_compare(self, img1, img2):
        """Compare images robust to common augmentations"""
        scores = []
        
        # Test with different brightness adjustments
        brightness_factors = [0.8, 1.0, 1.2]
        for factor in brightness_factors:
            adjusted = np.clip(img2.astype(np.float32) * factor, 0, 255).astype(np.uint8)
            
            # Simple correlation
            corr = cv2.matchTemplate(img1, adjusted, cv2.TM_CCOEFF_NORMED)
            scores.append(np.max(corr))
        
        # Test with small rotations (common in augmentation)
        for angle in [-5, 0, 5]:
            h, w = img2.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(img2, M, (w, h))
            
            corr = cv2.matchTemplate(img1, rotated, cv2.TM_CCOEFF_NORMED)
            scores.append(np.max(corr))
        
        # Test with slight scaling
        for scale in [0.95, 1.0, 1.05]:
            h, w = img2.shape
            new_h, new_w = int(h * scale), int(w * scale)
            if new_h > 0 and new_w > 0 and new_h <= img1.shape[0] and new_w <= img1.shape[1]:
                scaled = cv2.resize(img2, (new_w, new_h))
                
                # Pad or crop to match img1 size
                if scaled.shape[0] < img1.shape[0] or scaled.shape[1] < img1.shape[1]:
                    # Pad
                    pad_h = max(0, img1.shape[0] - scaled.shape[0])
                    pad_w = max(0, img1.shape[1] - scaled.shape[1])
                    scaled = cv2.copyMakeBorder(scaled, pad_h//2, pad_h-pad_h//2,
                                              pad_w//2, pad_w-pad_w//2, cv2.BORDER_CONSTANT)
                
                # Crop to match size
                scaled = scaled[:img1.shape[0], :img1.shape[1]]
                
                corr = cv2.matchTemplate(img1, scaled, cv2.TM_CCOEFF_NORMED)
                scores.append(np.max(corr))
        
        return max(scores) if scores else 0.0
    
    def swift_compare(self, path1, path2, verbose=True):
        """
        Swift comparison using multiple fast algorithms
        
        Returns:
            tuple: (is_same_scene, confidence_score, best_method, processing_time)
        """
        start_time = time.time()
        
        if verbose:
            print(f"🚀 Swift Image Matching")
            print(f"=" * 50)
            print(f"Image 1: {Path(path1).name}")
            print(f"Image 2: {Path(path2).name}")
            print(f"Threshold: {self.threshold:.3f}")
            print("-" * 50)
        
        # Load and preprocess images
        img1 = self.read_and_preprocess(path1)
        img2 = self.read_and_preprocess(path2)
        
        scores = {}
        methods = {}
        
        # 1. Histogram comparison (fastest)
        hist_score = self.histogram_comparison(img1, img2)
        scores['histogram'] = hist_score
        methods['histogram'] = "Histogram Correlation"
        
        # 2. Template matching (fast)
        template_score = self.template_matching(img1, img2)
        scores['template'] = template_score
        methods['template'] = "Template Matching"
        
        # 3. Phase correlation (fast)
        phase_score = self.phase_correlation(img1, img2)
        scores['phase'] = phase_score
        methods['phase'] = "Phase Correlation"
        
        # 4. Feature matching (moderate speed, high accuracy)
        kp1, desc1 = self.extract_features(img1)
        kp2, desc2 = self.extract_features(img2)
        feature_score = self.feature_matching(desc1, desc2, kp1, kp2)
        scores['features'] = feature_score
        methods['features'] = "ORB Feature Matching"
        
        # 5. Structural similarity (simple version)
        # Resize to small size for speed
        small1 = cv2.resize(img1, (64, 64))
        small2 = cv2.resize(img2, (64, 64))
        
        # Simple structural similarity
        diff = cv2.absdiff(small1, small2)
        mse = np.mean(diff ** 2)
        struct_score = max(0, 1.0 - (mse / 255.0))
        scores['structural'] = struct_score
        methods['structural'] = "Structural Similarity"
        
        # 6. Augmentation-robust comparison
        aug_score = self.augmentation_robust_compare(img1, img2)
        scores['augmentation'] = aug_score
        methods['augmentation'] = "Augmentation Robust"
        
        processing_time = time.time() - start_time
        
        if verbose:
            for method, score in scores.items():
                status = "✅" if score >= self.threshold else "❌"
                print(f"{status} {methods[method]:<25}: {score:.4f}")
        
        # Find best score and method
        best_method = max(scores.keys(), key=lambda k: scores[k])
        best_score = scores[best_method]
        
        # Weighted combination for final decision (updated weights)
        weights = {
            'histogram': 0.15,
            'template': 0.15,
            'phase': 0.10,
            'features': 0.30,  # Most reliable for keypoints
            'structural': 0.10,
            'augmentation': 0.20  # Good for augmented images
        }
        
        weighted_score = sum(scores[method] * weights[method] for method in scores.keys())
        
        is_same_scene = weighted_score >= self.threshold
        
        if verbose:
            print("-" * 50)
            print(f"🏆 Best individual: {methods[best_method]} ({best_score:.4f})")
            print(f"📊 Weighted average: {weighted_score:.4f}")
            print(f"⚡ Processing time: {processing_time:.3f}s")
            print("-" * 50)
            
            if is_same_scene:
                print(f"✅ Images show the SAME scene (confidence: {weighted_score:.1%})")
            else:
                print(f"❌ Images show DIFFERENT scenes (confidence: {(1-weighted_score):.1%})")
        
        return is_same_scene, weighted_score, methods[best_method], processing_time, scores, methods
    
    def batch_compare(self, image_pairs, output_file=None):
        """Compare multiple image pairs efficiently"""
        results = []
        total_start = time.time()
        
        print(f"🔄 Batch processing {len(image_pairs)} image pairs...")
        print("=" * 70)
        
        for i, (path1, path2) in enumerate(image_pairs, 1):
            print(f"\n[{i}/{len(image_pairs)}] Processing pair...")
            
            try:
                is_same, confidence, method, proc_time = self.swift_compare(
                    path1, path2, verbose=False
                )
                
                result = {
                    'pair_id': i,
                    'image1': Path(path1).name,
                    'image2': Path(path2).name,
                    'is_same_scene': is_same,
                    'confidence': confidence,
                    'best_method': method,
                    'processing_time': proc_time
                }
                
                results.append(result)
                
                status = "✅ SAME" if is_same else "❌ DIFFERENT"
                print(f"   {status} | Confidence: {confidence:.3f} | Time: {proc_time:.3f}s")
                
            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                results.append({
                    'pair_id': i,
                    'image1': Path(path1).name,
                    'image2': Path(path2).name,
                    'error': str(e)
                })
        
        total_time = time.time() - total_start
        avg_time = total_time / len(image_pairs)
        
        print(f"\n📊 Batch Summary:")
        print(f"   Total pairs: {len(image_pairs)}")
        print(f"   Total time: {total_time:.2f}s")
        print(f"   Average time per pair: {avg_time:.3f}s")
        
        if output_file:
            import json
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"   Results saved: {output_file}")
        
        return results

def main():
    if len(sys.argv) < 3:
        print("Usage: python swift_matcher.py <image1_path> <image2_path> [threshold]")
        print("Example: python swift_matcher.py img1.jpg img2.jpg 0.85")
        return
    
    path1 = sys.argv[1]
    path2 = sys.argv[2]
    threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.85
    
    if not os.path.exists(path1) or not os.path.exists(path2):
        print("Error: One or both image paths are invalid.")
        return
    
    # Create swift matcher and compare
    matcher = SwiftMatcher(threshold=threshold)
    is_same, confidence, method, proc_time = matcher.swift_compare(path1, path2)

if __name__ == "__main__":
    main()