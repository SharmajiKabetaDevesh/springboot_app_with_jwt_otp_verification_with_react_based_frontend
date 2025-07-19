package com.devesh.spring.otpwithjwtauth.security.services;


import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cglib.core.internal.LoadingCache;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {
    private static final Integer EXPIRE_MINS=5;
    private Cache<String,String> otpCache;
    private final Random random=new SecureRandom();
    public OtpService(){
        super();
        otpCache= Caffeine.newBuilder()
                .expireAfterWrite(EXPIRE_MINS, TimeUnit.MINUTES)
                .build();
    }

    public String generateOtp(String key){
        String otp=String.valueOf(100000+random.nextInt(900000));
        otpCache.put(key,otp);
        return otp;
    }

    public String getOtp(String key){
        return otpCache.getIfPresent(key);
    }

    public void clearOtp(String key){
        otpCache.invalidate(key);
    }
}
