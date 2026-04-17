import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
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
  const outpass = await getOutpassForStudent(session.uid, id);

  if (!outpass) {
    redirect("/student");
  }

  const qrToken = outpass.qrToken ?? outpass.id;
  const qrCodeUrl = await QRCode.toDataURL(qrToken, {
    width: 360,
    margin: 1,
    color: {
      dark: "#11192f",
      light: "#fff9ed",
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
              <Link className="ghost-button" href="/student">
                Back to dashboard
              </Link>
            </div>
            <div className="passport-qr">
              <Image src={qrCodeUrl} alt="CollegeGate QR pass" width={280} height={280} />
            </div>
          </div>
        </article>
      </section>
    </DashboardFrame>
  );
}
