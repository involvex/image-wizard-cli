from bing_create.main import ImageGenerator

# Create an instance of the ImageGenerator class
generator = ImageGenerator(
    auth_cookie_u="1HE7aP-EHWqSHcxPZO-XnjiJYquS1a0FRh3JQMwS-7TIxlCUjNgXb3zzQ4p80B6tgLIrq8PqfjIYf7XPWP7Ox8PZcg6kLs19Kz3sS7VQeYPhsKBANz8Q0he3vrn_O_w2rRAsHURVxhKaW2oKcSxXuXxgrZ8NR5mmTdp_IYQQ55IhWUE_Zr9alttdmUDqGMncLh5FzwUfZnM-2vdVsRiOS6g",
    auth_cookie_srchhpgusr="SRCHLANG=de&PV=19.0.0&PREFCOL=1&BRW=NOTP&BRH=M&CW=771&CH=914&SCW=756&SCH=914&DPR=1.0&UTC=60&PRVCW=1218&PRVCH=914&B=0&EXLTT=32&HV=1769901195&HVE=CfDJ8HAK7eZCYw5BifHFeUHnkJFvqEePzUT4Ba5yC4HMf7gQVgS1Kg0rMLGn9T2VOrJvwOz33K2tVOp8qzdO3OXMoSuEjlNzwMNdEmHrLsQF2YgBeeO-Aa9C8ClOxJM7TxsGgGU9OX_u2kV6EZd4pDsKT1F7xFQEtr7hXCMHIq2ll0BX_vhf6FTjVXFUqkJoZ8joxQ&AV=14&ADV=14&RB=1769897306292&MB=1767735921711&WEBTHEME=1",
)

# Generate 5 images from a text prompt
images = generator.generate(
    prompt="An awesome modern app icon , material theme for an app called image-wizard-cli",
    num_images=5,
)

# Save the images to the directory called 'output'
generator.save(images=images, output_dir="output")
