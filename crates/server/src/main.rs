//! The server. It will run the engine and answer paired devices; in
//! phase 0 it only prints its version.

fn main() {
    println!("a30m-server {}", env!("CARGO_PKG_VERSION"));
}
