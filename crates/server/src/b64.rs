//! Standard base64, for pictures sent inside JSON: the API takes JSON
//! only, and no crate is worth adding for this.

const ABC: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(ABC[((n >> (18 - 6 * i)) & 63) as usize] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}

pub fn decode(text: &str) -> Result<Vec<u8>, String> {
    // A data URL's prefix is allowed: the interface may send one.
    let text = text.split_once(";base64,").map_or(text, |(_, d)| d);
    let clean: Vec<u8> = text.bytes().filter(|c| !c.is_ascii_whitespace()).collect();
    if !clean.len().is_multiple_of(4) {
        return Err("not base64".into());
    }
    let mut out = Vec::with_capacity(clean.len() / 4 * 3);
    for quad in clean.chunks(4) {
        let mut n = 0u32;
        let mut pad = 0;
        for (i, &c) in quad.iter().enumerate() {
            let v = match c {
                b'A'..=b'Z' => c - b'A',
                b'a'..=b'z' => c - b'a' + 26,
                b'0'..=b'9' => c - b'0' + 52,
                b'+' => 62,
                b'/' => 63,
                b'=' if i >= 2 => {
                    pad += 1;
                    0
                }
                _ => return Err("not base64".into()),
            };
            if pad > 0 && c != b'=' {
                return Err("not base64".into());
            }
            n = (n << 6) | u32::from(v);
        }
        let bytes = [(n >> 16) as u8, (n >> 8) as u8, n as u8];
        out.extend_from_slice(&bytes[..3 - pad]);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips() {
        for s in ["", "f", "fo", "foo", "foob", "fooba", "foobar"] {
            assert_eq!(decode(&encode(s.as_bytes())).unwrap(), s.as_bytes());
        }
        assert_eq!(encode(b"foobar"), "Zm9vYmFy");
        assert_eq!(encode(b"fo"), "Zm8=");
        assert_eq!(decode("data:image/png;base64,Zm8=").unwrap(), b"fo");
        assert!(decode("Zm8").is_err());
        assert!(decode("Z=8=").is_err());
        assert!(decode("Zm8*").is_err());
        let all: Vec<u8> = (0..=255).collect();
        assert_eq!(decode(&encode(&all)).unwrap(), all);
    }
}
