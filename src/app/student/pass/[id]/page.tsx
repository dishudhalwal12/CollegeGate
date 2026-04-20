import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { PassQrTools } from "@/components/client-ui";
import { DashboardFrame, SectionHeading, StatusBadge } from "@/components/dashboard-ui";
import { requireSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/collegegate";
import { getOutpassForStudent } from "@/lib/data";

export default async function StudentPassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("student");
  const { id } = await params;
  const outpass = await getOutpassForStudent(session, id);

  if (!outpass) {
    redirect("/student");
  }

  const qrToken = outpass.qrToken ?? outpass.id;
  const qrCodeUrl = await QRCode.toDataURL(qrToken, {
    width: 480,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return (
    <DashboardFrame session={session} eyebrow="Student QR pass" title="Gate Passport">
      <section className="stack-sm">
        <SectionHeading title="Approved Pass" kicker="Show this at the gate" />
        <article className="passport-card">
          <div className="passport-grid">
            <div className="stack-sm">
              <p className="section-kicker">CollegeGate • Active outpass</p>
              <h2 className="outpass-passport-title">{outpass.destination}</h2>
              <StatusBadge outpass={outpass} />
              <div className="detail-grid">
                <div>
                  <p className="micro-copy">Departure</p>
                  <p>{formatDateTime(outpass.departureAt)}</p>
                </div>
                <div>
                  <p className="micro-copy">Expected Return</p>
                  <p>{formatDateTime(outpass.expectedReturnAt)}</p>
                </div>
                <div>
                  <p className="micro-copy">Warden</p>
                  <p>{outpass.assignedWardenName}</p>
                </div>
                <div>
                  <p className="micro-copy">Remark</p>
                  <p>{outpass.approverRemark ?? "No special remark"}</p>
                </div>
              </div>
              <p className="helper-copy">
                Present this QR code at the gate for exit and again on return. The same token
                drives the full guard log.
              </p>
              <PassQrTools
                qrToken={qrToken}
                qrCodeUrl={qrCodeUrl}
                filename={`collegegate-pass-${outpass.id}.png`}
              />
              <Link className="ghost-button" href="/student">
                Back to dashboard
              </Link>
            </div>
            <div className="passport-qr">
              <Image
                src={qrCodeUrl}
                alt="CollegeGate QR pass"
                width={320}
                height={320}
                unoptimized
              />
            </div>
          </div>
        </article>
      </section>
    </DashboardFrame>
  );
}
