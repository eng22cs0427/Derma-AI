"""
DermaSense AI Medical PDF Report Generator
Uses ReportLab (free, no external service needed)
"""
import io
import base64
import logging
from datetime import datetime
from typing import Optional, List

logger = logging.getLogger(__name__)


class MedicalReportGenerator:
    def generate(
        self,
        patient_name: str,
        patient_id: str,
        prediction_class: str,
        prediction_name: str,
        confidence: float,
        risk_level: str,
        severity_stage: int,
        severity_label: str,
        recommended_specialist: str,
        recommended_action: str,
        precautions: List[str],
        disease_info: str,
        all_predictions: dict,
        heatmap_base64: Optional[str] = None,
    ) -> bytes:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import mm
            from reportlab.lib import colors
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                HRFlowable, Image as RLImage, ListFlowable, ListItem
            )
            from reportlab.lib.enums import TA_CENTER

            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=A4,
                                    rightMargin=20*mm, leftMargin=20*mm,
                                    topMargin=15*mm, bottomMargin=15*mm,
                                    title="DermaSense AI Medical Report")
            styles = getSampleStyleSheet()
            story = []

            ds_blue = colors.Color(29/255, 78/255, 216/255)
            risk_colors = {
                "Very High": colors.Color(220/255, 38/255, 38/255),
                "High": colors.Color(234/255, 88/255, 12/255),
                "Medium": colors.Color(202/255, 138/255, 4/255),
                "Low": colors.Color(22/255, 163/255, 74/255),
            }
            risk_color = risk_colors.get(risk_level, colors.grey)
            now = datetime.now()

            # Header
            story.append(Paragraph("🧬 DermaSense AI", ParagraphStyle("T", parent=styles["Heading1"], fontSize=22, alignment=TA_CENTER, textColor=ds_blue)))
            story.append(Paragraph("AI-Powered Dermatology Medical Report", ParagraphStyle("S", parent=styles["Normal"], fontSize=11, alignment=TA_CENTER, textColor=colors.grey)))
            story.append(HRFlowable(width="100%", thickness=2, color=ds_blue))
            story.append(Spacer(1, 4*mm))

            # Patient info table
            info = [
                ["Patient Name", patient_name or "Unknown", "Report ID", f"DS-{now.strftime('%Y%m%d')}-{patient_id[:8].upper()}"],
                ["Scan Date", now.strftime("%B %d, %Y"), "Scan Time", now.strftime("%H:%M IST")],
                ["Report Type", "AI Skin Analysis", "Model", "EfficientNet-B4 v2.0"],
            ]
            t = Table(info, colWidths=[40*mm, 60*mm, 40*mm, 50*mm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (0,-1), colors.Color(0.95, 0.97, 1.0)),
                ("BACKGROUND", (2,0), (2,-1), colors.Color(0.95, 0.97, 1.0)),
                ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
                ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 9),
                ("GRID", (0,0), (-1,-1), 0.5, colors.lightgrey),
                ("PADDING", (0,0), (-1,-1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 5*mm))

            # Diagnosis banner
            story.append(Paragraph(
                f"AI Diagnosis: {prediction_name} ({prediction_class.upper()})",
                ParagraphStyle("D", parent=styles["Normal"], fontSize=16, fontName="Helvetica-Bold",
                               textColor=risk_color, alignment=TA_CENTER)
            ))
            story.append(Paragraph(
                f"Confidence: {confidence:.1f}%  |  Risk: {risk_level}  |  Stage {severity_stage} – {severity_label}",
                ParagraphStyle("C", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER, textColor=colors.grey)
            ))
            story.append(Spacer(1, 3*mm))

            # Risk banner
            rb = Table([[f"  ⚕ Risk Level: {risk_level}  "]], colWidths=["100%"])
            rb.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), risk_color),
                ("TEXTCOLOR", (0,0), (-1,-1), colors.white),
                ("FONTNAME", (0,0), (-1,-1), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 12),
                ("ALIGN", (0,0), (-1,-1), "CENTER"),
                ("PADDING", (0,0), (-1,-1), 8),
            ]))
            story.append(rb)
            story.append(Spacer(1, 5*mm))

            # Heatmap
            if heatmap_base64:
                try:
                    heat_bytes = base64.b64decode(heatmap_base64)
                    heat_img = RLImage(io.BytesIO(heat_bytes), width=80*mm, height=80*mm)
                    ht = Table([[heat_img], ["Grad-CAM Heatmap — AI Focus Area"]], colWidths=["100%"])
                    ht.setStyle(TableStyle([
                        ("ALIGN", (0,0), (-1,-1), "CENTER"),
                        ("FONTSIZE", (0,1), (-1,1), 9),
                        ("TEXTCOLOR", (0,1), (-1,1), colors.grey),
                    ]))
                    story.append(ht)
                    story.append(Spacer(1, 5*mm))
                except Exception:
                    pass

            sec = ParagraphStyle("SH", parent=styles["Heading2"], fontSize=12, textColor=ds_blue)
            body = ParagraphStyle("B", parent=styles["Normal"], fontSize=10, leading=16)

            # Clinical assessment
            story.append(Paragraph("🔬 Clinical Assessment", sec))
            story.append(Paragraph(disease_info, body))
            story.append(Spacer(1, 4*mm))

            # Recommended action
            story.append(Paragraph("✅ Recommended Action", sec))
            at = Table([[recommended_action]], colWidths=["100%"])
            at.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), colors.Color(0.94, 0.97, 1.0)),
                ("FONTNAME", (0,0), (-1,-1), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 11),
                ("PADDING", (0,0), (-1,-1), 10),
                ("GRID", (0,0), (-1,-1), 0.5, ds_blue),
            ]))
            story.append(at)
            story.append(Spacer(1, 3*mm))

            # Specialist
            story.append(Paragraph("👨‍⚕️ Recommended Specialist", sec))
            story.append(Paragraph(f"<b>{recommended_specialist}</b>", body))
            story.append(Spacer(1, 4*mm))

            # Precautions
            story.append(Paragraph("⚠️ Precautions", sec))
            items = [ListItem(Paragraph(p, body), bulletColor=risk_color) for p in precautions]
            story.append(ListFlowable(items, bulletType="bullet"))
            story.append(Spacer(1, 4*mm))

            # Probabilities table
            if all_predictions:
                story.append(Paragraph("📈 Prediction Probabilities", sec))
                sorted_p = sorted(all_predictions.items(), key=lambda x: x[1], reverse=True)
                pd = [["Condition", "Probability"]] + [[k.upper(), f"{v*100:.2f}%"] for k, v in sorted_p]
                pt = Table(pd, colWidths=[100*mm, 60*mm])
                pt.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,0), ds_blue),
                    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                    ("FONTSIZE", (0,0), (-1,-1), 9),
                    ("GRID", (0,0), (-1,-1), 0.5, colors.lightgrey),
                    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.whitesmoke]),
                    ("PADDING", (0,0), (-1,-1), 5),
                ]))
                story.append(pt)
                story.append(Spacer(1, 4*mm))

            # Disclaimer
            story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph(
                "⚠️ <b>Important Disclaimer:</b> This report is generated by an AI system and is for "
                "informational purposes only. It does <b>NOT</b> constitute a medical diagnosis. "
                "All findings must be reviewed by a qualified medical professional before any "
                "treatment decisions are made.",
                ParagraphStyle("Disc", parent=styles["Normal"], fontSize=8, textColor=colors.grey,
                               backColor=colors.whitesmoke, borderPadding=8, leading=12)
            ))

            doc.build(story)
            buf.seek(0)
            return buf.getvalue()

        except ImportError:
            logger.warning("ReportLab not installed — returning text report")
            return self._text_fallback(patient_name, prediction_name, confidence, risk_level)
        except Exception as e:
            logger.error(f"PDF generation error: {e}")
            return self._text_fallback(patient_name, prediction_name, confidence, risk_level)

    def _text_fallback(self, name, diagnosis, confidence, risk) -> bytes:
        return (
            f"DermaSense AI Medical Report\n{'='*40}\n"
            f"Patient: {name}\nDate: {datetime.now().strftime('%B %d, %Y %H:%M')}\n"
            f"Diagnosis: {diagnosis}\nConfidence: {confidence:.1f}%\nRisk: {risk}\n\n"
            f"This is an AI-assisted analysis. Consult a qualified dermatologist."
        ).encode()
