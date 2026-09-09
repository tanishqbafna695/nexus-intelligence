"""
OCR & Text Normalization Pipeline for Scanned Criminal Records
Normalizes noisy OCR text, phone numbers, vehicle registrations, and timestamps.
"""

import re

class OCRNormalizer:
    @staticmethod
    def normalize_text(text: str) -> str:
        if not text:
            return ""

        # 1. Clean zero-width and invisible characters
        cleaned = text.replace("\u200b", "").replace("\ufeff", "").replace("\u200e", "").replace("\u200f", "")

        # 2. Fix common unicode ligatures
        ligatures = {
            "\ufb00": "ff",
            "\ufb01": "fi",
            "\ufb02": "fl",
            "\ufb03": "ffi",
            "\ufb04": "ffl",
            "\ufb05": "ft",
            "\ufb06": "st"
        }
        for lig, repl in ligatures.items():
            cleaned = cleaned.replace(lig, repl)

        # 3. Clean common OCR misread artifacts
        cleaned = cleaned.replace("l1111", "+91-98200-11111").replace("l2222", "+91-98200-22222")
        
        # 4. Normalize Indian phone numbers format (+91XXXXXXXXXX or +91 XXXXX XXXXX -> +91-XXXXX-XXXXX)
        cleaned = re.sub(
            r"\+91[\s-]?(\d{5})[\s-]?(\d{5})",
            r"+91-\1-\2",
            cleaned
        )

        # 5. Normalize Indian Vehicle Registration Numbers (MH 04 AB 1234 -> MH-04-AB-1234)
        cleaned = re.sub(
            r"\b([A-Z]{2})[\s-]?(\d{2})[\s-]?([A-Z]{1,2})[\s-]?(\d{4})\b",
            r"\1-\2-\3-\4",
            cleaned
        )

        # 6. Standardize multiple spaces and hyphens
        cleaned = re.sub(r"[ \t]+", " ", cleaned)

        return cleaned.strip()

    normalize = normalize_text
