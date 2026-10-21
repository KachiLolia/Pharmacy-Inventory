'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  type DrugWithListing, 
  upsertOTCListing, 
  uploadOTCImage, 
  deleteOTCImage 
} from '@/app/actions/otc'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { 
  UploadCloud, 
  Trash2, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Link as LinkIcon, 
  ImageIcon, 
  Loader2, 
  AlertCircle,
  Check
} from 'lucide-react'

export function ListingDialog({ drug, listing }: { drug: DrugWithListing, listing?: DrugWithListing['listing'] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [listed, setListed] = useState(listing?.listed ?? false)
  const [priceOverride, setPriceOverride] = useState(listing?.price_override?.toString() ?? '')
  const [descriptionOverride, setDescriptionOverride] = useState(listing?.description_override ?? '')
  const [images, setImages] = useState<string[]>(listing?.images ?? [])

  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setListed(listing?.listed ?? false)
      setPriceOverride(listing?.price_override?.toString() ?? '')
      setDescriptionOverride(listing?.description_override ?? '')
      setImages(listing?.images ?? [])
      setErrorMsg(null)
      setShowUrlInput(false)
      setUrlInput('')
    }
  }, [open, listing])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setErrorMsg(null)
    setUploading(true)

    try {
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // 5MB client-side check
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5MB file limit.`)
        }

        let uploadedUrl: string | null = null

        // Strategy 1: Direct client upload to Supabase Storage
        try {
          const supabase = createBrowserClient()
          if (supabase && (supabase as any).storage) {
            const ext = file.name.split('.').pop() || 'jpg'
            const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`
            const filePath = `drugs/${drug.id}/${fileName}`

            const { data, error } = await supabase.storage
              .from('otc_images')
              .upload(filePath, file, {
                contentType: file.type || 'image/jpeg',
                upsert: true,
              })

            if (!error && data) {
              const { data: urlData } = supabase.storage
                .from('otc_images')
                .getPublicUrl(filePath)
              if (urlData?.publicUrl) {
                uploadedUrl = urlData.publicUrl
              }
            }
          }
        } catch (directErr) {
          console.warn('Direct upload skipped, falling back to API route:', directErr)
        }

        // Strategy 2: Upload via dedicated API route (/api/otc/upload)
        if (!uploadedUrl) {
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('drugId', drug.id)

            const apiRes = await fetch('/api/otc/upload', {
              method: 'POST',
              body: formData,
            })

            if (apiRes.ok) {
              const result = await apiRes.json()
              if (result.success && result.url) {
                uploadedUrl = result.url
              } else if (result.error) {
                console.warn('API route upload error:', result.error)
              }
            }
          } catch (apiErr) {
            console.warn('API route attempt failed, trying server action:', apiErr)
          }
        }

        // Strategy 3: Server Action fallback
        if (!uploadedUrl) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('drugId', drug.id)

          const res = await uploadOTCImage(formData)
          if (res.success && res.url) {
            uploadedUrl = res.url
          } else {
            throw new Error(res.error || `Failed to upload ${file.name}`)
          }
        }

        if (uploadedUrl) {
          newUrls.push(uploadedUrl)
        }
      }

      setImages((prev) => [...prev, ...newUrls])
    } catch (err: any) {
      console.error('Upload error in dialog:', err)
      let msg = err.message || 'Failed to upload image(s).'
      if (msg.includes('441') || msg.includes('Minified React error')) {
        msg = 'Upload failed. The image might exceed Vercel limits or the storage key is missing. You can paste an image URL directly using "Or add image via external URL".'
      }
      setErrorMsg(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleAddUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://')
      return
    }

    setImages((prev) => [...prev, trimmed])
    setUrlInput('')
    setShowUrlInput(false)
    setErrorMsg(null)
  }

  async function handleRemoveImage(indexToRemove: number) {
    const targetUrl = images[indexToRemove]
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))

    // Optional background clean-up if from our storage
    if (targetUrl.includes('otc_images')) {
      deleteOTCImage(targetUrl).catch(() => {})
    }
  }

  function handleSetPrimary(indexToPromote: number) {
    if (indexToPromote === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(indexToPromote, 1)
      copy.unshift(item)
      return copy
    })
  }

  function handleMoveImage(index: number, direction: 'left' | 'right') {
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= images.length) return

    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy
    })
  }

  async function handleSave() {
    try {
      setLoading(true)
      setErrorMsg(null)

      await upsertOTCListing(drug.id, {
        listed,
        price_override: priceOverride ? parseFloat(priceOverride) : null,
        description_override: descriptionOverride || null,
        images: images,
      })

      setOpen(false)
    } catch (error: any) {
      console.error(error)
      let msg = error.message || "Failed to update listing"
      if (msg.includes('441') || msg.includes('Minified React error')) {
        msg = "Failed to update listing on server. Please check your network and try again."
      }
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 px-3 text-primary hover:bg-primary/10 cursor-pointer border border-primary/20">
          Edit Listing
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Storefront Listing: {drug.name}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {drug.dose} {drug.category ? `• ${drug.category}` : ''} {drug.manufacturer ? `• ${drug.manufacturer}` : ''}
          </p>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Publish Switch */}
          <div className="flex flex-row items-center justify-between rounded-xl border bg-muted/20 p-4 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Publish to Storefront</Label>
              <p className="text-xs text-muted-foreground">
                Make this medication visible for public browsing and purchasing online.
              </p>
            </div>
            <Switch
              checked={listed}
              onCheckedChange={setListed}
            />
          </div>

          {/* Product Images Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" /> Product Images
                </Label>
                <p className="text-xs text-muted-foreground">
                  The first image will be used as the primary cover photo in product cards.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </Badge>
            </div>

            {/* Current Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((imgUrl, index) => {
                  const isPrimary = index === 0
                  return (
                    <div 
                      key={`${imgUrl}-${index}`}
                      className="group relative aspect-square rounded-lg border bg-muted/40 overflow-hidden shadow-sm"
                    >
                      <img
                        src={imgUrl}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />

                      {/* Primary Badge */}
                      {isPrimary && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className="inline-flex items-center gap-1 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm">
                            <Star className="w-3 h-3 fill-white" /> Cover
                          </span>
                        </div>
                      )}

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-10">
                        {/* Top bar controls */}
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="p-1 rounded bg-destructive text-white hover:bg-destructive/90 transition-colors shadow-sm"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Bottom bar controls */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(index, 'left')}
                                className="p-1 rounded bg-white/90 text-foreground hover:bg-white transition-colors shadow-sm"
                                title="Move earlier"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {index < images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(index, 'right')}
                                className="p-1 rounded bg-white/90 text-foreground hover:bg-white transition-colors shadow-sm"
                                title="Move later"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(index)}
                              className="px-1.5 py-1 rounded bg-white/95 text-foreground hover:bg-white text-[10px] font-medium transition-colors shadow-sm flex items-center gap-1"
                              title="Set as cover image"
                            >
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              Cover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Dropzone / Upload Action */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                uploading 
                  ? 'bg-muted/50 border-primary/40 cursor-wait' 
                  : 'bg-muted/10 hover:bg-muted/30 border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <Loader2 className="w-7 h-7 text-primary animate-spin mb-2" />
                  <p className="text-sm font-medium">Uploading to Supabase Storage...</p>
                  <p className="text-xs text-muted-foreground">Please wait while the image is uploaded</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Click to upload product image(s)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPG, or WEBP up to 5MB each • Multi-select supported
                  </p>
                </div>
              )}
            </div>

            {/* Toggle URL Input */}
            <div className="pt-1">
              {!showUrlInput ? (
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <LinkIcon className="w-3 h-3" /> Or add image via external URL
                </button>
              ) : (
                <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                  <Label htmlFor="image_url_input" className="text-xs font-semibold">
                    Image URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="image_url_input"
                      placeholder="https://example.com/product-image.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="text-xs h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddUrl()
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="secondary" 
                      onClick={handleAddUrl}
                      className="h-8 text-xs px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowUrlInput(false)}
                      className="h-8 text-xs px-2 text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Override */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="priceOverride" className="text-sm font-semibold">
              Price Override (₦)
            </Label>
            <Input
              id="priceOverride"
              type="number"
              step="0.01"
              placeholder="Leave empty to use live price"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If set, this fixed price overrides inventory cost adjustments on the storefront.
            </p>
          </div>

          {/* Description Override */}
          <div className="space-y-2">
            <Label htmlFor="descriptionOverride" className="text-sm font-semibold">
              Public Description
            </Label>
            <Textarea
              id="descriptionOverride"
              placeholder="Optional custom description for online shoppers..."
              value={descriptionOverride}
              onChange={(e) => setDescriptionOverride(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to automatically display default formulation, dosage, and verified NAFDAC notice.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex flex-row items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {images.length} {images.length === 1 ? 'image selected' : 'images selected'}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading || uploading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

