import struct

CONTAINERS = (b'moov', b'trak', b'mdia', b'minf', b'stbl')


def top_boxes(data: bytes):
    out = []
    o = 0
    n = len(data)
    while o + 8 <= n:
        size, typ = struct.unpack('>I4s', data[o:o + 8])
        if size == 1:
            size = struct.unpack('>Q', data[o + 8:o + 16])[0]
        elif size == 0:
            size = n - o
        out.append((typ, o, size))
        o += size
    return out


def patch_offsets(buf: bytearray, start: int, end: int, delta: int):
    o = start
    while o + 8 <= end:
        size, typ = struct.unpack('>I4s', bytes(buf[o:o + 8]))
        if size < 8:
            break
        if typ in CONTAINERS:
            patch_offsets(buf, o + 8, o + size, delta)
        elif typ == b'stco':
            cnt = struct.unpack('>I', bytes(buf[o + 12:o + 16]))[0]
            for i in range(cnt):
                p = o + 16 + i * 4
                v = struct.unpack('>I', bytes(buf[p:p + 4]))[0] + delta
                buf[p:p + 4] = struct.pack('>I', v)
        elif typ == b'co64':
            cnt = struct.unpack('>I', bytes(buf[o + 12:o + 16]))[0]
            for i in range(cnt):
                p = o + 16 + i * 8
                v = struct.unpack('>Q', bytes(buf[p:p + 8]))[0] + delta
                buf[p:p + 8] = struct.pack('>Q', v)
        o += size


def make_faststart(data: bytes):
    boxes = top_boxes(data)
    names = [b[0] for b in boxes]
    if b'moov' not in names or b'mdat' not in names:
        return None
    if names.index(b'moov') < names.index(b'mdat'):
        return None
    moov_t, moov_o, moov_s = boxes[names.index(b'moov')]
    moov = bytearray(data[moov_o:moov_o + moov_s])
    patch_offsets(moov, 8, len(moov), len(moov))
    ftyp = [b for b in boxes if b[0] == b'ftyp'][0]
    rest = b''.join(data[o:o + s] for t, o, s in boxes if t not in (b'ftyp', b'moov'))
    return data[ftyp[1]:ftyp[1] + ftyp[2]] + bytes(moov) + rest
