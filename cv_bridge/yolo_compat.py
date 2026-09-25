"""
JUNCTION YOLOv12 Architecture Compatibility Adapter
Ensures backward compatibility across different YOLOv12 checkpoint revisions (dual QK/V conv vs unified QKV conv).
"""

import torch
import torch.nn as nn


def apply_yolov12_compat_patch():
    """
    Patches Ultralytics AAttn module to support both:
    1. Early YOLOv12 checkpoints with separate self.qk and self.v layers
    2. Upstream Ultralytics checkpoints with unified self.qkv layer
    """
    try:
        import ultralytics.nn.modules.block as block
        
        orig_forward = block.AAttn.forward

        def compat_forward(self, x: torch.Tensor) -> torch.Tensor:
            B, _, H, W = x.shape
            N = H * W

            if hasattr(self, "qkv"):
                return orig_forward(self, x)

            # Checkpoint with separate qk and v convolution layers
            qk = self.qk(x).flatten(2).transpose(1, 2)
            v = self.v(x).flatten(2).transpose(1, 2)

            if self.area > 1:
                qk = qk.reshape(B * self.area, N // self.area, self.all_head_dim * 2)
                v = v.reshape(B * self.area, N // self.area, self.all_head_dim)
                B, N, _ = qk.shape

            q, k = (
                qk.view(B, N, self.num_heads, self.head_dim * 2)
                .permute(0, 2, 3, 1)
                .split([self.head_dim, self.head_dim], dim=2)
            )
            v = v.view(B, N, self.num_heads, self.head_dim).permute(0, 2, 3, 1)

            attn = (q * (self.head_dim**-0.5)).transpose(-2, -1) @ k
            attn = attn.softmax(dim=-1)
            x = v @ attn.transpose(-2, -1)
            x = x.permute(0, 3, 1, 2)
            v = v.permute(0, 3, 1, 2)

            if self.area > 1:
                x = x.reshape(B // self.area, N * self.area, self.all_head_dim)
                v = v.reshape(B // self.area, N * self.area, self.all_head_dim)
                B, N, _ = x.shape

            x = x.reshape(B, H, W, self.all_head_dim).permute(0, 3, 1, 2).contiguous()
            v = v.reshape(B, H, W, self.all_head_dim).permute(0, 3, 1, 2).contiguous()

            x = x + self.pe(v)
            return self.proj(x)

        block.AAttn.forward = compat_forward
    except Exception as e:
        # If ultralytics is not installed or has different structure, proceed normally
        pass
