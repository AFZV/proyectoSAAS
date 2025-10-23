import { Module } from '@nestjs/common';
import { AuthPublicController } from './auth-public.controller';
import { AuthPublicService } from './auth-public.service';
import { ClerkModule } from '../clerk/clerk.module';

@Module({
    imports: [ClerkModule],
    controllers: [AuthPublicController],
    providers: [AuthPublicService],
})
export class AuthPublicModule { }
