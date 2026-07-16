-- Additive fork column used to carry the native Hysteria2 leaf-certificate
-- fingerprint into generated subscription links.
ALTER TABLE "hosts" ADD COLUMN "pinned_peer_cert_sha256" TEXT;
